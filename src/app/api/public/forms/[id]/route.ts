import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity";

// Respondents have no Supabase session — both routes below go through the
// service-role key and enforce their own boundary (status must be
// 'published') instead of relying on RLS, which has no policy for the
// unauthenticated role on these tables by design.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const admin = createAdminClient();
  const { data: form } = await admin
    .from("forms")
    .select("id, title, description, fields, status")
    .eq("id", id)
    .single();

  if (!form || form.status !== "published") {
    return NextResponse.json({ error: "This form isn't accepting responses" }, { status: 404 });
  }

  return NextResponse.json({
    form: { id: form.id, title: form.title, description: form.description, fields: form.fields },
  });
}

const submitSchema = z.object({
  answers: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  respondentEmail: z.string().email().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = submitSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid submission" }, { status: 400 });

  const admin = createAdminClient();
  const { data: form } = await admin
    .from("forms")
    .select("id, organization_id, title, fields, status")
    .eq("id", id)
    .single();

  if (!form || form.status !== "published") {
    return NextResponse.json({ error: "This form isn't accepting responses" }, { status: 404 });
  }

  const fields = form.fields as { id: string; label: string; required: boolean }[];
  for (const field of fields) {
    if (field.required && !(field.id in parsed.data.answers)) {
      return NextResponse.json({ error: `"${field.label}" is required` }, { status: 400 });
    }
  }

  const { error } = await admin.from("form_responses").insert({
    form_id: form.id,
    organization_id: form.organization_id,
    answers: parsed.data.answers,
    respondent_email: parsed.data.respondentEmail ?? null,
  });

  if (error) return NextResponse.json({ error: "Could not submit response" }, { status: 500 });

  await logActivity(admin, {
    organizationId: form.organization_id,
    actorId: null,
    action: "form_response_received",
    detail: `New response to: ${form.title}`,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
