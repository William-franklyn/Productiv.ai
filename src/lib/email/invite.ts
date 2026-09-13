import "server-only";
import { Resend } from "resend";

function getClient() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendWorkspaceInvite(params: {
  to: string;
  orgName: string;
  inviteUrl: string;
  message?: string | null;
}) {
  const client = getClient();
  if (!client) return { sent: false as const, reason: "not_configured" as const };

  try {
    await client.emails.send({
      from: process.env.RESEND_FROM ?? "iRABU <onboarding@resend.dev>",
      to: params.to,
      subject: `You've been invited to join ${params.orgName} on iRABU`,
      html: `
        <p>You've been invited to join <strong>${params.orgName}</strong> on iRABU.</p>
        ${params.message ? `<p>"${params.message}"</p>` : ""}
        <p><a href="${params.inviteUrl}">Accept the invite</a></p>
      `,
    });
    return { sent: true as const };
  } catch (err) {
    return { sent: false as const, reason: "send_failed" as const, error: String(err) };
  }
}
