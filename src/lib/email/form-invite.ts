import "server-only";
import { Resend } from "resend";

function getClient() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendFormLink(params: {
  to: string;
  formTitle: string;
  formUrl: string;
  message?: string | null;
}) {
  const client = getClient();
  if (!client) return { sent: false as const, reason: "not_configured" as const };

  try {
    // See src/lib/email/draft.ts — the Resend SDK resolves with
    // { error: {...} } on an API-level rejection rather than throwing.
    const result = await client.emails.send({
      from: process.env.RESEND_FROM ?? "iRABU <onboarding@resend.dev>",
      to: params.to,
      subject: `Please fill out: ${params.formTitle}`,
      html: `
        <p>You've been asked to fill out <strong>${params.formTitle}</strong>.</p>
        ${params.message ? `<p>${params.message}</p>` : ""}
        <p><a href="${params.formUrl}">Open the form</a></p>
      `,
    });
    if (result.error) {
      return { sent: false as const, reason: "send_failed" as const, error: result.error.message };
    }
    return { sent: true as const };
  } catch (err) {
    return { sent: false as const, reason: "send_failed" as const, error: String(err) };
  }
}
