import { NextRequest, NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import { sendMeetingCancellation } from "@/lib/email/meeting-invite";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = await createClient();

  const { data: meeting } = await supabase
    .from("meetings")
    .select("title, starts_at, duration_minutes, notes, attendee_email")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("meetings").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (meeting) {
    await logActivity(supabase, {
      organizationId: auth.orgId,
      actorId: auth.userId,
      action: "cancelled_meeting",
      detail: `Cancelled meeting: ${meeting.title}`,
    });

    if (meeting.attendee_email) {
      await sendMeetingCancellation({
        meetingId: id,
        title: meeting.title,
        startsAt: meeting.starts_at,
        durationMinutes: meeting.duration_minutes,
        notes: meeting.notes,
        attendeeEmail: meeting.attendee_email,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
