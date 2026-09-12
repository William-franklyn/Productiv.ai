import { NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .insert({ organization_id: auth.orgId, user_id: auth.userId })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not start conversation" }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
