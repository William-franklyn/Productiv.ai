import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthApi } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import { sendMeetingInvite } from "@/lib/email/meeting-invite";

export async function GET() {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meetings")
    .select("id, title, starts_at, duration_minutes, notes, attendee_email")
    .eq("organization_id", auth.orgId)
    .order("starts_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ meetings: data });
}

const bodySchema = z.object({
  title: z.string().min(1).max(200),
  startsAt: z.string(),
  durationMinutes: z.number().min(5).max(480).default(30),
  notes: z.string().max(2000).optional(),
  attendeeEmail: z.string().email().optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meetings")
    .insert({
      organization_id: auth.orgId,
      created_by: auth.userId,
      title: parsed.data.title,
      starts_at: parsed.data.startsAt,
      duration_minutes: parsed.data.durationMinutes,
      notes: parsed.data.notes ?? null,
      attendee_email: parsed.data.attendeeEmail ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not create meeting" }, { status: 500 });
  }

  await logActivity(supabase, {
    organizationId: auth.orgId,
    actorId: auth.userId,
    action: "scheduled_meeting",
    detail: `Scheduled meeting: ${parsed.data.title}`,
  });

  if (parsed.data.attendeeEmail) {
    await sendMeetingInvite({
      meetingId: data.id,
      title: parsed.data.title,
      startsAt: parsed.data.startsAt,
      durationMinutes: parsed.data.durationMinutes,
      notes: parsed.data.notes,
      attendeeEmail: parsed.data.attendeeEmail,
    });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
