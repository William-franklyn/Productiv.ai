import { NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createDemoCustomer, createDemoAccount, getAccount, isNessieConfigured } from "@/lib/nessie/client";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data: connection } = await supabase
    .from("nessie_connections")
    .select("id, account_id, nickname, created_at")
    .eq("organization_id", auth.orgId)
    .maybeSingle();

  if (!connection) {
    return NextResponse.json({ connected: false, configured: isNessieConfigured() });
  }

  try {
    const account = await getAccount(connection.account_id);
    return NextResponse.json({
      connected: true,
      nickname: connection.nickname,
      balance: account.balance,
      connectedAt: connection.created_at,
    });
  } catch {
    return NextResponse.json({
      connected: true,
      nickname: connection.nickname,
      balance: null,
      connectedAt: connection.created_at,
      error: "Could not reach Nessie",
    });
  }
}

const STARTING_BALANCE = 25000;

export async function POST() {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role === "member") {
    return NextResponse.json({ error: "Only owners and admins can connect finance" }, { status: 403 });
  }
  if (!isNessieConfigured()) {
    return NextResponse.json({ error: "Nessie isn't configured (missing NESSIE_API_KEY)" }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("nessie_connections")
    .select("id")
    .eq("organization_id", auth.orgId)
    .maybeSingle();
  if (existing) return NextResponse.json({ error: "Already connected" }, { status: 409 });

  try {
    const customerId = await createDemoCustomer(auth.orgName);
    const nickname = `${auth.orgName} Checking`;
    const accountId = await createDemoAccount(customerId, nickname, STARTING_BALANCE);

    const admin = createAdminClient();
    await admin.from("nessie_connections").insert({
      organization_id: auth.orgId,
      customer_id: customerId,
      account_id: accountId,
      nickname,
      created_by: auth.userId,
    });

    await logActivity(supabase, {
      organizationId: auth.orgId,
      actorId: auth.userId,
      action: "connected_finance",
      detail: "Connected a demo Capital One (Nessie) account",
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not create demo account" },
      { status: 502 },
    );
  }
}

export async function DELETE() {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role === "member") {
    return NextResponse.json({ error: "Only owners and admins can disconnect finance" }, { status: 403 });
  }

  const supabase = await createClient();
  await supabase.from("nessie_connections").delete().eq("organization_id", auth.orgId);
  return NextResponse.json({ ok: true });
}
