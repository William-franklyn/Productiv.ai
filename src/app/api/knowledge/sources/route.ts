import { NextRequest, NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SUPPORTED_MIME_TYPES } from "@/lib/knowledge/extract";
import { ingestSource } from "@/lib/knowledge/ingest";
import { logActivity } from "@/lib/activity";

const MAX_FILE_BYTES = 15 * 1024 * 1024;

export async function GET() {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("knowledge_sources")
    .select("id, name, mime_type, status, error, created_at")
    .eq("organization_id", auth.orgId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ sources: data });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File is too large (15MB max)" }, { status: 400 });
  }
  if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type || "unknown"}` },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { data: source, error: insertError } = await admin
    .from("knowledge_sources")
    .insert({
      organization_id: auth.orgId,
      name: file.name,
      mime_type: file.type,
      storage_path: "",
      status: "processing",
      created_by: auth.userId,
    })
    .select("id")
    .single();

  if (insertError || !source) {
    return NextResponse.json({ error: "Could not create source" }, { status: 500 });
  }

  const storagePath = `${auth.orgId}/${source.id}/${file.name}`;
  const { error: uploadError } = await admin.storage
    .from("knowledge")
    .upload(storagePath, buffer, { contentType: file.type });

  if (uploadError) {
    await admin.from("knowledge_sources").delete().eq("id", source.id);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  await admin
    .from("knowledge_sources")
    .update({ storage_path: storagePath })
    .eq("id", source.id);

  await ingestSource({
    sourceId: source.id,
    organizationId: auth.orgId,
    buffer,
    mimeType: file.type,
  });

  await logActivity(admin, {
    organizationId: auth.orgId,
    actorId: auth.userId,
    action: "uploaded_document",
    detail: `Uploaded ${file.name}`,
  });

  return NextResponse.json({ id: source.id }, { status: 201 });
}
