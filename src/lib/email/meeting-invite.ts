import "server-only";
import { Resend } from "resend";
import { buildMeetingICS } from "./ics";

const ORGANIZER_EMAIL = "invites@irabu.local";

function getClient() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

interface MeetingEmailParams {
  meetingId: string;
  title: string;
  startsAt: string;
  durationMinutes: number;
  notes?: string | null;
  attendeeEmail: string;
}

export async function sendMeetingInvite(params: MeetingEmailParams) {
  const client = getClient();
  if (!client) return { sent: false as const, reason: "not_configured" as const };

  const uid = `${params.meetingId}@irabu`;
  const ics = buildMeetingICS({
    uid,
    title: params.title,
    startsAt: params.startsAt,
    durationMinutes: params.durationMinutes,
    notes: params.notes,
    organizerEmail: ORGANIZER_EMAIL,
    attendeeEmail: params.attendeeEmail,
    method: "REQUEST",
  });

  const when = new Date(params.startsAt).toLocaleString();

  try {
    // See src/lib/email/draft.ts — the Resend SDK resolves with
    // { error: {...} } on an API-level rejection rather than throwing.
    const result = await client.emails.send({
      from: process.env.RESEND_FROM ?? "iRABU <onboarding@resend.dev>",
      to: params.attendeeEmail,
      subject: `Invitation: ${params.title}`,
      html: `<p>You've been invited to <strong>${params.title}</strong>.</p><p>${when} · ${params.durationMinutes} minutes</p>${params.notes ? `<p>${params.notes}</p>` : ""}`,
      attachments: [
        {
          filename: "invite.ics",
          content: Buffer.from(ics).toString("base64"),
        },
      ],
    });
    if (result.error) {
      return { sent: false as const, reason: "send_failed" as const, error: result.error.message };
    }
    return { sent: true as const };
  } catch (err) {
    return { sent: false as const, reason: "send_failed" as const, error: String(err) };
  }
}

export async function sendMeetingCancellation(params: MeetingEmailParams) {
  const client = getClient();
  if (!client) return { sent: false as const, reason: "not_configured" as const };

  const uid = `${params.meetingId}@irabu`;
  const ics = buildMeetingICS({
    uid,
    title: params.title,
    startsAt: params.startsAt,
    durationMinutes: params.durationMinutes,
    notes: params.notes,
    organizerEmail: ORGANIZER_EMAIL,
    attendeeEmail: params.attendeeEmail,
    method: "CANCEL",
  });

  try {
    // See src/lib/email/draft.ts — the Resend SDK resolves with
    // { error: {...} } on an API-level rejection rather than throwing.
    const result = await client.emails.send({
      from: process.env.RESEND_FROM ?? "iRABU <onboarding@resend.dev>",
      to: params.attendeeEmail,
      subject: `Cancelled: ${params.title}`,
      html: `<p><strong>${params.title}</strong> has been cancelled.</p>`,
      attachments: [
        {
          filename: "cancel.ics",
          content: Buffer.from(ics).toString("base64"),
        },
      ],
    });
    if (result.error) {
      return { sent: false as const, reason: "send_failed" as const, error: result.error.message };
    }
    return { sent: true as const };
  } catch (err) {
    return { sent: false as const, reason: "send_failed" as const, error: String(err) };
  }
}
