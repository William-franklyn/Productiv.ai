import "server-only";
import { Resend } from "resend";

function getClient() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

// Resend can only send "From" a verified domain, so a drafted email can't
// go out as the user's own address — it goes out from iRABU's sender
// with the user's own address as reply-to, so replies land with them.
export async function sendDraftEmail(params: {
  to: string;
  subject: string;
  body: string;
  replyTo?: string | null;
}) {
  const client = getClient();
  if (!client) return { sent: false as const, reason: "not_configured" as const };

  try {
    // The Resend SDK does NOT throw on an API-level rejection (bad sender
    // domain, sandbox recipient restriction, etc.) — it resolves with
    // { data: null, error: {...} }. Checking only for a thrown exception
    // meant every send silently reported success even when Resend rejected
    // it outright — confirmed empirically: an unchecked send to an
    // obviously-fake domain returned no exception at all.
    const result = await client.emails.send({
      from: process.env.RESEND_FROM ?? "iRABU <onboarding@resend.dev>",
      to: params.to,
      replyTo: params.replyTo ?? undefined,
      subject: params.subject,
      html: params.body
        .split("\n")
        .map((line) => `<p>${line || "&nbsp;"}</p>`)
        .join(""),
    });
    if (result.error) {
      return { sent: false as const, reason: "send_failed" as const, error: result.error.message };
    }
    return { sent: true as const };
  } catch (err) {
    return { sent: false as const, reason: "send_failed" as const, error: String(err) };
  }
}
