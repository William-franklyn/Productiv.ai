import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { lamportsPerAnswer } from "@/lib/solana/rates";

// Public, no auth — a sponsor has no account. Everything returned here is
// safe to be fully public: names, counts, amounts, tx signatures. Never a
// member identity or a query's content.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const admin = createAdminClient();

  const { data: org } = await admin
    .from("organizations")
    .select("id, name, credit_balance")
    .eq("sponsor_slug", slug)
    .single();

  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [{ count: answeredCount }, { count: refusedCount }, { data: ledger }] = await Promise.all([
    admin
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", org.id)
      .eq("kind", "answered"),
    admin
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", org.id)
      .eq("kind", "refused"),
    admin
      .from("usage_events")
      .select("kind, cost_lamports, tx_sig, created_at")
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  return NextResponse.json({
    orgName: org.name,
    answersLeft: Math.max(0, Math.floor(org.credit_balance / lamportsPerAnswer())),
    answeredCount: answeredCount ?? 0,
    refusedCount: refusedCount ?? 0,
    ledger: ledger ?? [],
  });
}
