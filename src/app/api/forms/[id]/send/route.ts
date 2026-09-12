import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthApi } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { sendFormLink } from "@/lib/email/form-invite";
import { logActivity } from "@/lib/activity";

const bodySchema = z.object({
  emails: z.array(z.string().email()).min(1).max(50),
  message: z.string().max(500).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { id } = await params;
  const supabase = await createClient();
  const { data: form } = await supabase
    .from("forms")
    .select("id, title, status")
    .eq("id", id)
    .eq("organization_id", auth.orgId)
    .single();

  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (form.status !== "published") {
    return NextResponse.json({ error: "Publish the form before sending it" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const formUrl = `${appUrl}/f/${form.id}`;

  const results = await Promise.all(
    parsed.data.emails.map((to) =>
      sendFormLink({ to, formTitle: form.title, formUrl, message: parsed.data.message }),
    ),
  );
  const sentCount = results.filter((r) => r.sent).length;

  await logActivity(supabase, {
    organizationId: auth.orgId,
    actorId: auth.userId,
    action: "sent_form",
    detail: `Sent "${form.title}" to ${parsed.data.emails.length} recipient(s)`,
  });

  return NextResponse.json({ ok: true, sentCount, total: parsed.data.emails.length });
}
