import { NextRequest, NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = await createClient();

  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select("id, title, mode")
    .eq("id", id)
    .single();
  if (convError || !conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: messages, error: msgError } = await supabase
    .from("messages")
    .select("id, role, content, citations, chart, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  if (msgError) {
    return NextResponse.json({ error: msgError.message }, { status: 500 });
  }

  return NextResponse.json({ conversation, messages });
}
