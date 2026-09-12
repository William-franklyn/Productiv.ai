import { NextRequest, NextResponse } from "next/server";
import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { requireAuthApi } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { chatModel } from "@/lib/ai/provider";
import { buildTools } from "@/lib/ai/tools";
import { getCitations, getChart, getText } from "@/lib/ai/message-parts";

function systemPrompt() {
  const now = new Date();
  const today = now.toLocaleDateString("en-CA"); // YYYY-MM-DD
  const weekday = now.toLocaleDateString("en-US", { weekday: "long" });

  return `You are the ProductivAI assistant for this workspace. Today is ${weekday}, ${today} (use this to resolve relative dates like "tomorrow" or "next Friday" — never ask the user what today's date is). You have these tools:

- search_knowledge: look up passages from the team's uploaded documents. Use it before answering anything that could be grounded in their knowledge base, and say plainly when it finds nothing rather than guessing.
- create_task: create a to-do for the team when the user asks you to track an action item.
- generate_chart: render a bar chart, line chart, or single stat tile when the user asks to visualize, chart, plot, or break down numbers — including numbers they just gave you in the conversation.
- schedule_meeting: schedule a meeting when the user gives you a title and a time. Resolve relative dates yourself using today's date above — only ask if the time itself is genuinely missing or ambiguous. If they give you an external person's email, pass it as attendeeEmail — that person gets an actual calendar invite by email, so only do this when an email address was actually given, never invent one.
- list_meetings: list upcoming meetings when asked what's scheduled.
- cancel_meeting: cancel a meeting by matching its title. If it comes back ambiguous (multiple matches) or not found, tell the user what matched (or didn't) and ask them to be more specific rather than picking one yourself.

Be concise and direct. When you cite knowledge, refer to the source naturally in your sentence (e.g. "According to the Q3 plan…") — the UI attaches full citation details on its own.`;
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
  if (lastMessage?.role === "user") {
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: getText(lastMessage),
    });
  }

  const result = streamText({
    model: chatModel,
    system: systemPrompt(),
    messages: await convertToModelMessages(messages),
    tools: buildTools({ supabase, orgId: auth.orgId, userId: auth.userId }),
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse({
    onFinish: async ({ messages: finished }) => {
      const assistantMessage = finished[finished.length - 1];
      if (assistantMessage?.role !== "assistant") return;

      await supabase.from("messages").insert({
        conversation_id: conversationId,
        role: "assistant",
        content: getText(assistantMessage),
        citations: getCitations(assistantMessage),
        chart: getChart(assistantMessage),
      });
    },
  });
}
