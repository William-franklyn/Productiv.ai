import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

  const { data: events } = await admin
    .from("usage_events")
    .select("action, outcome, credits, tx_sig, created_at")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false });

  const all = events ?? [];
  const breakdown = { answer: 0, task: 0, meeting: 0, email: 0 };
  let refusedCount = 0;
  for (const e of all) {
    if (e.outcome === "completed") breakdown[e.action as keyof typeof breakdown]++;
    else if (e.outcome === "refused") refusedCount++;
  }

  return NextResponse.json({
    orgName: org.name,
    actionsLeft: Math.max(0, org.credit_balance),
    breakdown,
    refusedCount,
    ledger: all.slice(0, 30),
  });
}
