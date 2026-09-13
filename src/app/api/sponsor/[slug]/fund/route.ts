import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { transferSol, createReceiveOnlyWallet, isSolanaConfigured, explorerUrl } from "@/lib/solana/client";
import { lamportsPerCredit } from "@/lib/solana/rates";
import { logActivity } from "@/lib/activity";

const LAMPORTS_PER_SOL = 1_000_000_000;

const bodySchema = z.object({ solAmount: z.number().positive().max(1000) });

// Public, no auth — the one write path a sponsor (no account, no session)
// can trigger. This is the sponsor-credit rail only: a real devnet SOL
// transfer into the org's receive-only wallet, crediting credit_balance.
// It never touches Nessie or the org-money rail — see
// docs/sponsored-credits.md on why those two never overlap.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid SOL amount" }, { status: 400 });
  if (!isSolanaConfigured()) return NextResponse.json({ error: "Funding isn't configured" }, { status: 503 });

  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("id, name, wallet_address")
    .eq("sponsor_slug", slug)
    .single();
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let walletAddress = org.wallet_address;
  if (!walletAddress) {
    walletAddress = createReceiveOnlyWallet();
    await admin.from("organizations").update({ wallet_address: walletAddress }).eq("id", org.id);
  }

  const lamports = Math.round(parsed.data.solAmount * LAMPORTS_PER_SOL);

  try {
    const txSig = await transferSol({ toAddress: walletAddress, lamports });

    const credits = Math.floor(lamports / lamportsPerCredit());
    await admin.rpc("increment_organization_credit", { org_id: org.id, credit_amount: credits });

    await logActivity(admin, {
      organizationId: org.id,
      actorId: null,
      action: "sponsor_funded",
      detail: `A sponsor funded ${parsed.data.solAmount} devnet SOL (${credits} credits)`,
    });

    return NextResponse.json({ ok: true, txSig, explorerUrl: explorerUrl(txSig), credits }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not process funding" },
      { status: 502 },
    );
  }
}
