import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createDemoCustomer, createDemoAccount, createDeposit, isNessieConfigured } from "@/lib/nessie/client";
import { lamportsPerDollar } from "@/lib/solana/rates";
import { logActivity } from "@/lib/activity";

const bodySchema = z.object({ amountUsd: z.number().positive().max(100000) });

// Public, no auth — this is the one write path a sponsor (no account, no
// session) can trigger. Money-in only: it funds credit_balance via a real
// Nessie sandbox deposit and never touches the Solana settlement ledger,
// which only ever records consumption.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid amount" }, { status: 400 });
  if (!isNessieConfigured()) return NextResponse.json({ error: "Funding isn't configured" }, { status: 503 });

  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("id, name")
    .eq("sponsor_slug", slug)
    .single();
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let { data: connection } = await admin
    .from("nessie_connections")
    .select("account_id")
    .eq("organization_id", org.id)
    .maybeSingle();

  try {
    if (!connection) {
      const customerId = await createDemoCustomer(org.name);
      const accountId = await createDemoAccount(customerId, `${org.name} Checking`, 0);
      await admin.from("nessie_connections").insert({
        organization_id: org.id,
        customer_id: customerId,
        account_id: accountId,
        nickname: `${org.name} Checking`,
      });
      connection = { account_id: accountId };
    }

    const depositId = await createDeposit({
      accountId: connection.account_id,
      amount: parsed.data.amountUsd,
      description: "Sponsor funding",
    });

    await admin.from("receipts").insert({
      organization_id: org.id,
      direction: "received",
      counterparty: "Sponsor",
      amount: parsed.data.amountUsd,
      notes: "Workspace funding",
      transaction_id: depositId,
    });

    const creditedLamports = Math.round(parsed.data.amountUsd * lamportsPerDollar());
    await admin.rpc("increment_organization_credit", {
      org_id: org.id,
      lamports: creditedLamports,
    });

    await logActivity(admin, {
      organizationId: org.id,
      actorId: null,
      action: "sponsor_funded",
      detail: `A sponsor funded $${parsed.data.amountUsd.toFixed(2)}`,
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not process funding" },
      { status: 502 },
    );
  }
}
