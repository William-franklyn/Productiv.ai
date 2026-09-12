import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthApi } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import { fieldSchema } from "@/lib/forms/types";

export async function GET() {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const [{ data: forms, error }, { data: responses }] = await Promise.all([
    supabase
      .from("forms")
      .select("id, title, status, created_at")
      .eq("organization_id", auth.orgId)
      .order("created_at", { ascending: false }),
    supabase
      .from("form_responses")
      .select("form_id")
      .eq("organization_id", auth.orgId),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const counts = new Map<string, number>();
  for (const r of responses ?? []) counts.set(r.form_id, (counts.get(r.form_id) ?? 0) + 1);

  return NextResponse.json({
    forms: (forms ?? []).map((f) => ({ ...f, responseCount: counts.get(f.id) ?? 0 })),
  });
}

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  fields: z.array(fieldSchema).default([]),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("forms")
    .insert({
      organization_id: auth.orgId,
      created_by: auth.userId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      fields: parsed.data.fields,
    })
    .select("id")
    .single();

  if (error || !data) return NextResponse.json({ error: "Could not create form" }, { status: 500 });

  await logActivity(supabase, {
    organizationId: auth.orgId,
    actorId: auth.userId,
    action: "created_form",
    detail: `Created form: ${parsed.data.title}`,
  });

  return NextResponse.json({ id: data.id }, { status: 201 });
}
