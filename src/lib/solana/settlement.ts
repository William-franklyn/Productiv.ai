import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { settleBatch, isSolanaConfigured } from "./client";

// Small on purpose: devnet transactions are fast and free, so batching
// every few events keeps the sponsor's live ledger feeling live instead of
// waiting for a large batch to accumulate.
export const SETTLE_BATCH_SIZE = 3;

/**
 * Anchors every unsettled usage_event for an org in one Solana devnet memo
 * transaction, then backfills tx_sig onto each of them. Safe to call
 * whenever — a no-op if nothing's unsettled or Solana isn't configured.
 */
export async function settleUnsettledUsage(
  organizationId: string,
): Promise<{ settled: number; txSig: string } | null> {
  if (!isSolanaConfigured()) return null;

  const admin = createAdminClient();
  const { data: events } = await admin
    .from("usage_events")
    .select("id, action, outcome, credits")
    .eq("organization_id", organizationId)
    .is("tx_sig", null);

  if (!events || events.length === 0) return null;

  const counts: Record<string, number> = {};
  for (const e of events) {
    const key = `${e.action}_${e.outcome}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  const totalCredits = events.reduce((sum, e) => sum + e.credits, 0);

  const txSig = await settleBatch({ organizationId, counts, totalCredits });

  await admin
    .from("usage_events")
    .update({ tx_sig: txSig })
    .in(
      "id",
      events.map((e) => e.id),
    );

  return { settled: events.length, txSig };
}
