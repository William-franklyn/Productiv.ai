import { NextRequest, NextResponse } from "next/server";
import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { requireAuthApi } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { chatModel } from "@/lib/ai/provider";
import { buildTools } from "@/lib/ai/tools";
import { getText, getOrderedChunks } from "@/lib/ai/message-parts";

const CHAT_MODE_PROMPT = `You are ProductivAI's knowledge chat. Use search_knowledge to find relevant passages before answering anything that could be grounded in the workspace's documents.

When a claim in your answer draws on a specific retrieved passage, cite it inline immediately after the claim using its number in brackets, like this[1]. Numbers match the order search_knowledge returned passages in — the first passage is [1], the second [2], and so on. If a claim draws on more than one passage, stack the markers like this[1][2].

If search_knowledge finds nothing relevant, say so plainly rather than guessing. Be concise.`;

const SEARCH_MODE_PROMPT = `You are ProductivAI's knowledge chat in Search mode: extractive only. Use search_knowledge, then respond using only direct quotes or near-verbatim sentences from the retrieved passages — no synthesis, no summarizing across passages, no added analysis or opinion.

Every sentence must end with a citation marker like [1] referencing the passage it came from, using the same numbering search_knowledge returned. If nothing relevant is found, say so plainly and stop.`;

const TITLE_MAX_LENGTH = 60;

export async function POST(req: NextRequest) {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messages, conversationId }: { messages: UIMessage[]; conversationId: string } =
    await req.json();

  const supabase = await createClient();

  const dailyLimit = Number(process.env.ASSISTANT_DAILY_LIMIT ?? 100);
  const { error: limitError } = await supabase.rpc("increment_usage", {
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

  const { data: conversation } = await supabase
    .from("conversations")
    .select("mode, title")
    .eq("id", conversationId)
    .single();
  const mode = conversation?.mode === "search" ? "search" : "chat";

  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.role === "user") {
    const text = getText(lastMessage);
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: text,
    });

    if (!conversation?.title || conversation.title === "New conversation") {
      await supabase
        .from("conversations")
        .update({ title: text.slice(0, TITLE_MAX_LENGTH) })
        .eq("id", conversationId);
    }
  }

  const { search_knowledge } = buildTools({
    supabase,
    orgId: auth.orgId,
    userId: auth.userId,
  });

  const result = streamText({
    model: chatModel,
    system: mode === "search" ? SEARCH_MODE_PROMPT : CHAT_MODE_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: { search_knowledge },
    stopWhen: stepCountIs(4),
  });

  return result.toUIMessageStreamResponse({
    onFinish: async ({ messages: finished }) => {
      const assistantMessage = finished[finished.length - 1];
      if (assistantMessage?.role !== "assistant") return;

      const chunks = getOrderedChunks(assistantMessage);
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        role: "assistant",
        content: getText(assistantMessage),
        citations: chunks,
      });
    },
  });
}
