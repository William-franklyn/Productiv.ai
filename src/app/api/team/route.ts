import { NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role").order("created_at"),
    supabase
      .from("org_invites")
      .select("id, email, role, token, created_at")
      .is("redeemed_at", null)
      .order("created_at", { ascending: false }),
  ]);

  return NextResponse.json({ members: members ?? [], invites: invites ?? [] });
}
