import { NextRequest, NextResponse } from "next/server";
import { sweepStaleUnsettledUsage } from "@/lib/solana/settlement";

// Called by an external timer (Vultr cron), not by anything in the app —
// see docs/solana-settlement-worker.md. Bearer-token gated since it's an
// unauthenticated-by-Supabase route hit from outside the app entirely.
export async function POST(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const header = req.headers.get("authorization");

  if (!expected || header !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sweepStaleUnsettledUsage();
  return NextResponse.json(result);
}
