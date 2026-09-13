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
    .from("pending_payments")
    .select("id, vendor_name, amount, description, status, created_at, sent_at")
    .eq("id", id)
    .eq("organization_id", auth.orgId)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ payment: data });
}

const patchSchema = z.object({
  vendorName: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  description: z.string().optional(),
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

  const update: Record<string, string | number> = {};
  if (parsed.data.vendorName !== undefined) update.vendor_name = parsed.data.vendorName;
  if (parsed.data.amount !== undefined) update.amount = parsed.data.amount;
  if (parsed.data.description !== undefined) update.description = parsed.data.description;

  const { error } = await supabase
    .from("pending_payments")
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
    .from("pending_payments")
    .update({ status: "discarded" })
    .eq("id", id)
    .eq("organization_id", auth.orgId)
    .eq("status", "pending");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
