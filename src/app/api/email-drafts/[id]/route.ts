import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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
  const { data, error } = await supabase
    .from("email_drafts")
    .select("id, to_email, subject, body, status, created_at, sent_at")
    .eq("id", id)
    .eq("organization_id", auth.orgId)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ draft: data });
}

const patchSchema = z.object({
  to: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { id } = await params;
  const supabase = await createClient();

  const update: Record<string, string> = {};
  if (parsed.data.to !== undefined) update.to_email = parsed.data.to;
  if (parsed.data.subject !== undefined) update.subject = parsed.data.subject;
  if (parsed.data.body !== undefined) update.body = parsed.data.body;

  const { error } = await supabase
    .from("email_drafts")
    .update(update)
    .eq("id", id)
    .eq("organization_id", auth.orgId)
    .eq("status", "pending");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase
    .from("email_drafts")
    .update({ status: "discarded" })
    .eq("id", id)
    .eq("organization_id", auth.orgId)
    .eq("status", "pending");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
