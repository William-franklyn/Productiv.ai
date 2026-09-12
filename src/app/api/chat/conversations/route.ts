import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthApi } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("id, title, mode, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ conversations: data });
}

const bodySchema = z.object({
  mode: z.enum(["chat", "search"]).default("chat"),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .insert({
      organization_id: auth.orgId,
      user_id: auth.userId,
      mode: parsed.data.mode,
    })
    .select("id, title, mode, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not start conversation" }, { status: 500 });
  }
  return NextResponse.json({ conversation: data }, { status: 201 });
}
