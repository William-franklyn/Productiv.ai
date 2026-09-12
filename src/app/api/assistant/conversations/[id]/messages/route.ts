import { NextRequest, NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import type { UIMessage } from "ai";

interface StoredMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: { sourceId: string; sourceName: string }[];
  chart: Record<string, unknown> | null;
}

// Reconstructs a UIMessage good enough for the chat UI to render history the
// same way it looked live: citations and chart are synthesized back into
// fake tool-call parts (the shape ChatMessage's getters already read), since
// only the outcome — not the full tool-call trace — was ever persisted.
function toUIMessage(row: StoredMessage): UIMessage {
  const parts: UIMessage["parts"] = [{ type: "text", text: row.content }];

  if (row.role === "assistant" && row.citations?.length > 0) {
    parts.push({
      type: "tool-search_knowledge",
      toolCallId: `history-${row.id}`,
      state: "output-available",
      input: {},
      output: { found: true, chunks: row.citations.map((c) => ({ ...c, content: "" })) },
    } as unknown as UIMessage["parts"][number]);
  }

  if (row.role === "assistant" && row.chart) {
    parts.push({
      type: "tool-generate_chart",
      toolCallId: `history-chart-${row.id}`,
      state: "output-available",
      input: {},
      output: row.chart,
    } as unknown as UIMessage["parts"][number]);
  }

  return { id: row.id, role: row.role, parts };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = await createClient();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", id)
    .eq("organization_id", auth.orgId)
    .eq("user_id", auth.userId)
    .single();
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("messages")
    .select("id, role, content, citations, chart")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: (data ?? []).map(toUIMessage) });
}
