import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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
  const { data, error } = await supabase
    .from("knowledge_source_restrictions")
    .select("restricted_user_id")
    .eq("source_id", id)
    .eq("organization_id", auth.orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ restrictedUserIds: (data ?? []).map((r) => r.restricted_user_id) });
}

const putSchema = z.object({ restrictedUserIds: z.array(z.string().uuid()) });

// Replaces the whole restricted set for this source in one call — the
// picker UI always sends the full desired set, so there's nothing to diff.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = putSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { id } = await params;
  const supabase = await createClient();

  const { data: source } = await supabase
    .from("knowledge_sources")
    .select("id")
    .eq("id", id)
    .eq("organization_id", auth.orgId)
    .single();
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await supabase
    .from("knowledge_source_restrictions")
    .delete()
    .eq("source_id", id)
    .eq("organization_id", auth.orgId);

  if (parsed.data.restrictedUserIds.length > 0) {
    const { error } = await supabase.from("knowledge_source_restrictions").insert(
      parsed.data.restrictedUserIds.map((userId) => ({
        source_id: id,
        organization_id: auth.orgId,
        restricted_user_id: userId,
      })),
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
