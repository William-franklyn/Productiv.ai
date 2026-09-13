import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAccount } from "./client";

// Nessie's account `balance` field doesn't reflect purchases made against
// it — verified directly against the API: even a PUT explicitly setting a
// new balance is silently ignored, the field never changes after account
// creation. So the number shown here is our own ledger instead: the
// account's starting balance minus every payment we've actually sent.
export async function getEffectiveBalance(
  supabase: SupabaseClient,
  orgId: string,
  accountId: string,
): Promise<{ nickname: string; balance: number }> {
  const [account, { data: sentPayments }] = await Promise.all([
    getAccount(accountId),
    supabase
      .from("pending_payments")
      .select("amount")
      .eq("organization_id", orgId)
      .eq("status", "sent"),
  ]);

  const totalSent = (sentPayments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  return { nickname: account.nickname, balance: account.balance - totalSent };
}
