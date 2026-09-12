import { NextRequest, NextResponse } from "next/server";
import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { requireAuthApi } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { chatModel } from "@/lib/ai/provider";
import { buildTools } from "@/lib/ai/tools";
import { getCitations, getChart, getText } from "@/lib/ai/message-parts";

const SYSTEM_PROMPT = `You are the ProductivAI assistant for this workspace. You have three tools:

- search_knowledge: look up passages from the team's uploaded documents. Use it before answering anything that could be grounded in their knowledge base, and say plainly when it finds nothing rather than guessing.
- create_task: create a to-do for the team when the user asks you to track an action item.
- generate_chart: render a bar chart, line chart, or single stat tile when the user asks to visualize, chart, plot, or break down numbers — including numbers they just gave you in the conversation.

Be concise and direct. When you cite knowledge, refer to the source naturally in your sentence (e.g. "According to the Q3 plan…") — the UI attaches full citation details on its own.`;

export async function POST(req: NextRequest) {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messages, conversationId }: { messages: UIMessage[]; conversationId: string } =
    await req.json();

  const supabase = await createClient();

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
    system: SYSTEM_PROMPT,
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
