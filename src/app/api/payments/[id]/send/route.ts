import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthApi } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { createPurchase } from "@/lib/nessie/client";
import { logActivity } from "@/lib/activity";

// The only path that actually moves (sandbox) money — reachable only from
// the review panel's own Send click, never from the agent directly, same
// contract as /api/email-drafts/[id]/send.
const bodySchema = z.object({
  vendorName: z.string().min(1),
  amount: z.number().positive(),
  description: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid vendor name and amount are required" }, { status: 400 });
  }

  const { id } = await params;
  const supabase = await createClient();

  const { data: payment } = await supabase
    .from("pending_payments")
    .select("id, status")
    .eq("id", id)
    .eq("organization_id", auth.orgId)
    .single();

  if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (payment.status !== "pending") {
    return NextResponse.json({ error: "This payment was already sent or discarded" }, { status: 409 });
  }

  const { data: connection } = await supabase
    .from("nessie_connections")
    .select("account_id")
    .eq("organization_id", auth.orgId)
    .maybeSingle();
  if (!connection) return NextResponse.json({ error: "No Capital One account connected" }, { status: 400 });

  let purchaseId: string;
  try {
    purchaseId = await createPurchase({
      accountId: connection.account_id,
      vendorName: parsed.data.vendorName,
      amount: parsed.data.amount,
      description: parsed.data.description,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not create the payment" },
      { status: 502 },
    );
  }

  await supabase
    .from("pending_payments")
    .update({
      vendor_name: parsed.data.vendorName,
      amount: parsed.data.amount,
      description: parsed.data.description ?? null,
      status: "sent",
      nessie_purchase_id: purchaseId,
      sent_at: new Date().toISOString(),
    })
    .eq("id", id);

  await logActivity(supabase, {
    organizationId: auth.orgId,
    actorId: auth.userId,
    action: "sent_payment",
    detail: `Paid ${parsed.data.vendorName}: $${parsed.data.amount.toFixed(2)}`,
  });

  return NextResponse.json({ ok: true });
}
