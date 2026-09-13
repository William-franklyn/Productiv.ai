import "server-only";

// Persona — identity verification, gating access to an org's most sensitive
// knowledge sources. See docs/verified-access.md.
//
// The embedded widget's onComplete callback runs in the browser and can be
// faked by anyone with devtools open — it is never trusted on its own. Every
// verification is confirmed here, server-side, by asking Persona directly
// for that inquiry's real status before anything gets written to the
// caller's profile.
const API_BASE = "https://api.withpersona.com/api/v1";
const PERSONA_VERSION = "2023-01-05";

interface PersonaInquiry {
  id: string;
  attributes: {
    status: string;
  };
}

function apiKey(): string | null {
  return process.env.PERSONA_API_KEY || null;
}

export function isPersonaConfigured(): boolean {
  return Boolean(apiKey());
}

const APPROVED_STATUSES = new Set(["completed", "approved"]);

export async function confirmInquiry(
  inquiryId: string,
): Promise<{ approved: boolean; status: string } | null> {
  if (!apiKey()) return null;

  const res = await fetch(`${API_BASE}/inquiries/${inquiryId}`, {
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Persona-Version": PERSONA_VERSION,
    },
  });
  if (!res.ok) return null;

  const body = (await res.json()) as { data: PersonaInquiry };
  const status = body.data.attributes.status;
  return { approved: APPROVED_STATUSES.has(status), status };
}
