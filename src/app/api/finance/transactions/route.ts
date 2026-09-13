import { NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { listTransactions } from "@/lib/nessie/client";

export async function GET() {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data: connection } = await supabase
    .from("nessie_connections")
    .select("account_id")
    .eq("organization_id", auth.orgId)
    .maybeSingle();

  if (!connection) return NextResponse.json({ error: "Not connected" }, { status: 404 });

  try {
    const transactions = await listTransactions(connection.account_id);
    return NextResponse.json({ transactions });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not fetch transactions" },
      { status: 502 },
    );
  }
}
