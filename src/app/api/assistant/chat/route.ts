import { NextRequest, NextResponse } from "next/server";
import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { requireAuthApi } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { chatModel } from "@/lib/ai/provider";
import { buildTools } from "@/lib/ai/tools";
import { getCitations, getChart, getText, classifyUsageEvents } from "@/lib/ai/message-parts";
import { settleUnsettledUsage, SETTLE_BATCH_SIZE } from "@/lib/solana/settlement";
import { isBackboardConfigured, getOrCreateAssistantId, searchMemories, writeMemory } from "@/lib/backboard/client";

function systemPrompt(memoryContext?: string) {
  const now = new Date();
  const today = now.toLocaleDateString("en-CA"); // YYYY-MM-DD
  const weekday = now.toLocaleDateString("en-US", { weekday: "long" });

  const memoryBlock = memoryContext
    ? `\n\nRelevant memory from past conversations with this workspace (use it silently — never mention "memory" or that you recalled something, just use the facts naturally if relevant; ignore anything irrelevant to the current question):\n${memoryContext}`
    : "";

  return `You are the ProductivAI assistant for this workspace. Today is ${weekday}, ${today} (use this to resolve relative dates like "tomorrow" or "next Friday" — never ask the user what today's date is). You have these tools:

- search_knowledge: look up passages from the team's uploaded documents. Use it before answering anything that could be grounded in their knowledge base, and say plainly when it finds nothing rather than guessing.
- create_task: create a to-do for the team when the user asks you to track an action item. If they say who should do it, pass assigneeName — otherwise leave it unassigned.
- list_tasks: list tasks when asked what's outstanding or what's assigned to someone. Defaults to open tasks; pass assignedToMe for "my tasks."
- complete_task: mark a task done by matching its title, when the user says something is finished.
- generate_chart: render a bar chart, line chart, or single stat tile when the user asks to visualize, chart, plot, or break down numbers — including numbers they just gave you in the conversation.
- schedule_meeting: schedule a meeting when the user gives you a title and a time. Resolve relative dates yourself using today's date above — only ask if the time itself is genuinely missing or ambiguous. If they give you an external person's email, pass it as attendeeEmail — that person gets an actual calendar invite by email, so only do this when an email address was actually given, never invent one.
- list_meetings: list upcoming meetings when asked what's scheduled.
- cancel_meeting: cancel a meeting by matching its title. If it comes back ambiguous (multiple matches) or not found, tell the user what matched (or didn't) and ask them to be more specific rather than picking one yourself.
- draft_email: draft an email when the user asks you to write, draft, or compose one. This never sends anything — it opens a review panel where the user edits and sends it themselves. If they didn't give a recipient address, leave "to" blank and say they'll need to fill it in.
- analyze_data: use this instead of search_knowledge whenever a question needs math across an entire uploaded data file (totals, averages, "which region had the most") rather than finding a relevant passage — search_knowledge only surfaces semantically similar snippets and can't add up a column. Follow up with generate_chart to visualize the result when it would help.
- restrict_source_access: use this when the user asks to restrict, hide, or block specific people from an uploaded document, or to lift that restriction. Everyone in the workspace can see a document by default — this only manages a deny-list of specific people on top of that.
- create_form: use this when the user asks to create, build, or make a form or survey. It publishes by default so the link is immediately shareable — share the returned link with the user.
- list_form_responses: use this when the user asks what responses a form has gotten, or to summarize/read them back.
- get_account_balance: use this when asked about the workspace's (demo Capital One) account balance.
- list_transactions: use this when asked to list or show recent transactions.
- analyze_spending: use this instead of list_transactions when asked about totals or where money went — it groups by vendor. Follow up with generate_chart to visualize the breakdown when it would help.
- pay_vendor: use this when the user asks to pay, send money to, or reimburse a vendor. This NEVER actually sends money — it only opens a review panel where a human approves and sends it themselves.
- receive_payment: use this when the user says they got paid, were reimbursed, or received money — this records immediately, no approval needed.
- get_receipt: use this when the user asks for the details of a specific past transaction (who, when, transaction id, notes) — defaults to the most recent one if they don't name someone.

Be concise and direct. When you cite knowledge, refer to the source naturally in your sentence (e.g. "According to the Q3 plan…") — the UI attaches full citation details on its own.${memoryBlock}`;
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messages, conversationId }: { messages: UIMessage[]; conversationId: string } =
    await req.json();

  const supabase = await createClient();

  const dailyLimit = Number(process.env.ASSISTANT_DAILY_LIMIT ?? 100);
  const { error: limitError } = await supabase.rpc("increment_usage", {
    org_id: auth.orgId,
    daily_limit: dailyLimit,
  });
  if (limitError) {
    return NextResponse.json(
      {
        error: `You've reached today's limit of ${dailyLimit} assistant messages. Try again tomorrow.`,
      },
      { status: 429 },
    );
  }

  const lastMessage = messages[messages.length - 1];
  let userText = "";
  if (lastMessage?.role === "user") {
    userText = getText(lastMessage);
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: userText,
    });

    const { data: conversation } = await supabase
      .from("conversations")
      .select("title")
      .eq("id", conversationId)
      .single();
    if (conversation?.title === "New conversation") {
      await supabase
        .from("conversations")
        .update({ title: userText.slice(0, 60) })
        .eq("id", conversationId);
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Cross-session memory (Backboard.io) — best-effort, never blocks the
  // chat turn. See docs/backboard-memory.md.
  const backboardAssistantId = isBackboardConfigured()
    ? await getOrCreateAssistantId(supabase, auth.orgId, auth.orgName)
    : null;
  const memories = backboardAssistantId && userText
    ? await searchMemories(backboardAssistantId, userText)
    : [];
  const memoryContext = memories.length
    ? memories.map((m) => `- ${m.content}`).join("\n")
    : undefined;

  const result = streamText({
    model: chatModel,
    system: systemPrompt(memoryContext),
    messages: await convertToModelMessages(messages),
    tools: buildTools({
      supabase,
      orgId: auth.orgId,
      userId: auth.userId,
      userEmail: user?.email ?? null,
    }),
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse({
    onFinish: async ({ messages: finished }) => {
      const assistantMessage = finished[finished.length - 1];
      if (assistantMessage?.role !== "assistant") return;

      const assistantText = getText(assistantMessage);
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        role: "assistant",
        content: assistantText,
        citations: getCitations(assistantMessage),
        chart: getChart(assistantMessage),
      });

      if (backboardAssistantId && userText && assistantText) {
        await writeMemory(backboardAssistantId, `Q: ${userText}\nA: ${assistantText}`);
      }

      // Sponsored-credits usage ledger — one event per chargeable action in
      // this turn, refusals/failures are free. See docs/sponsored-credits.md.
      const usageEvents = classifyUsageEvents(assistantMessage);
      for (const event of usageEvents) {
        await supabase.rpc("record_usage_event", {
          org_id: auth.orgId,
          event_action: event.action,
          event_outcome: event.outcome,
          event_credits: event.credits,
        });
      }
      if (usageEvents.length === 0) return;

      const { count: unsettledCount } = await supabase
        .from("usage_events")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", auth.orgId)
        .is("tx_sig", null);

      if ((unsettledCount ?? 0) >= SETTLE_BATCH_SIZE) {
        await settleUnsettledUsage(auth.orgId).catch(() => {
          // Solana devnet unreachable or unfunded — events stay unsettled
          // and get picked up on the next trigger or a manual settle.
        });
      }
    },
  });
}
