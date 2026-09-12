function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeICSText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

export function buildMeetingICS(params: {
  uid: string;
  title: string;
  startsAt: string;
  durationMinutes: number;
  notes?: string | null;
  organizerEmail: string;
  attendeeEmail: string;
  method?: "REQUEST" | "CANCEL";
}): string {
  const { uid, title, startsAt, durationMinutes, notes, organizerEmail, attendeeEmail } = params;
  const method = params.method ?? "REQUEST";
  const start = new Date(startsAt);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const status = method === "CANCEL" ? "CANCELLED" : "CONFIRMED";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ProductivAI//Meetings//EN",
    `METHOD:${method}`,
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(start)}`,
    `DTEND:${formatICSDate(end)}`,
    `SUMMARY:${escapeICSText(title)}`,
    ...(notes ? [`DESCRIPTION:${escapeICSText(notes)}`] : []),
    `ORGANIZER:mailto:${organizerEmail}`,
    `ATTENDEE;RSVP=TRUE:mailto:${attendeeEmail}`,
    `STATUS:${status}`,
    `SEQUENCE:${method === "CANCEL" ? 1 : 0}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.join("\r\n");
}
