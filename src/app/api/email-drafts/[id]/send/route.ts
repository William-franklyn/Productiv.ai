import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthApi } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import { sendDraftEmail } from "@/lib/email/draft";

// The only path that actually sends a drafted email — callable only from the
// review panel's own Send click, never from the agent directly. Callers can
// send the current edited fields; whatever's here is what goes out, and it's
// persisted back onto the row so the record matches what was actually sent.
const bodySchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid recipient, subject, and body are required" }, { status: 400 });
  }

  const { id } = await params;
  const supabase = await createClient();

  const { data: draft } = await supabase
    .from("email_drafts")
    .select("id, status, reply_to_email")
    .eq("id", id)
    .eq("organization_id", auth.orgId)
    .single();

  if (!draft) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (draft.status !== "pending") {
    return NextResponse.json({ error: "This draft was already sent or discarded" }, { status: 409 });
  }

  const result = await sendDraftEmail({
    to: parsed.data.to,
    subject: parsed.data.subject,
    body: parsed.data.body,
    replyTo: draft.reply_to_email,
  });

  if (!result.sent) {
    return NextResponse.json({ error: "Could not send email — check RESEND_API_KEY" }, { status: 502 });
  }

  await supabase
    .from("email_drafts")
    .update({
      to_email: parsed.data.to,
      subject: parsed.data.subject,
      body: parsed.data.body,
      status: "sent",
      sent_at: new Date().toISOString(),
    })
    .eq("id", id);

  await logActivity(supabase, {
    organizationId: auth.orgId,
    actorId: auth.userId,
    action: "sent_email",
    detail: `Sent email: ${parsed.data.subject}`,
  });

  return NextResponse.json({ ok: true });
}
