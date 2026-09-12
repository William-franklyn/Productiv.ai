import { NextRequest, NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();

  const { data: source } = await admin
    .from("knowledge_sources")
    .select("id, organization_id, storage_path")
    .eq("id", id)
    .single();

  if (!source || source.organization_id !== auth.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (source.storage_path) {
    await admin.storage.from("knowledge").remove([source.storage_path]);
  }
  await admin.from("knowledge_sources").delete().eq("id", id);

  return NextResponse.json({ ok: true });
}
