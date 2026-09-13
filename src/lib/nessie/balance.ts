import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAccount } from "./client";

// Nessie's account `balance` field doesn't reflect purchases or deposits
// made against it — verified directly against the API: even a PUT
// explicitly setting a new balance is silently ignored, the field never
// changes after account creation. So the number shown here is our own
// ledger instead: the starting balance plus every receipt we've recorded,
// in whichever direction it went.
export async function getEffectiveBalance(
  supabase: SupabaseClient,
  orgId: string,
  accountId: string,
): Promise<{ nickname: string; balance: number }> {
  const [account, { data: receipts }] = await Promise.all([
    getAccount(accountId),
    supabase
      .from("receipts")
      .select("direction, amount")
      .eq("organization_id", orgId),
  ]);

  const net = (receipts ?? []).reduce(
    (sum, r) => sum + (r.direction === "received" ? Number(r.amount) : -Number(r.amount)),
    0,
  );
  return { nickname: account.nickname, balance: account.balance + net };
}
