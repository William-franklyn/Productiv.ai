import { NextRequest, NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = await createClient();

  const { data: form } = await supabase
    .from("forms")
    .select("id, title, fields")
    .eq("id", id)
    .eq("organization_id", auth.orgId)
    .single();
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: responses, error } = await supabase
    .from("form_responses")
    .select("id, answers, respondent_email, submitted_at")
    .eq("form_id", id)
    .eq("organization_id", auth.orgId)
    .order("submitted_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ form, responses });
}
