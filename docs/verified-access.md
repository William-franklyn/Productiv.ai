# Verified access for the AI agent

An AI agent is useful because it has broad access — give it the org's
knowledge base and it can answer anything. That breadth is also the risk: the
agent acts *on behalf of* whoever's talking to it, but has no reliable way to
know who that actually is. A prompt-level instruction ("don't reveal patient
data to unapproved staff") isn't an access control — the model has no ground
truth about the caller, and a rule stated in the same channel as the attack
can be argued with.

This moves the decision out of the conversation and into Postgres RLS, where
a prompt can't reach it. The running example: a small NGO's ARV (antiretroviral,
HIV treatment) patient registry — real names, real regimens, the kind of
document that should need more than "is this person in the workspace."

## The two separate checks

**Identity** (Persona) proves someone is a real, specific human. It does
**not** by itself grant access to anything — it just makes the next check
trustworthy instead of "taking the user's word for who they are."

**Authorization** (an org owner/admin's approval) is the separate grant that
actually matters: *may this specific verified person see this org's most
sensitive sources.* Both must be true. A verified-but-unapproved person sees
nothing sensitive; an approved-but-unverified profile is impossible by
construction (approval only makes sense once identity is real).

Critically, **authorization is per-organization**, not global. A user can
belong to more than one workspace (`docs/` elsewhere in this repo covers the
multi-workspace model) — approval in one org has nothing to do with another.

## Schema

- `profiles.persona_inquiry_id` / `persona_verified_at` — identity is a
  property of the *person*, set once, shared across every org they're in.
- `memberships.sensitive_access_approved` — authorization is a property of
  the *(person, org)* pair, exactly like `role` already is on the same table.
- `knowledge_sources.requires_verification` — marks a specific source (e.g.
  the ARV registry) as needing both of the above, on top of normal org
  membership.
- `access_audit_log` — one row per decision (allowed or denied), tied to a
  verified identity and a specific source, not an anonymous session.

## The gate is RLS, not the tool

`knowledge_sources` and `knowledge_chunks` SELECT policies both require
`has_verified_sensitive_access(organization_id)` when `requires_verification`
is set. `match_knowledge_chunks` (the RPC `search_knowledge` calls) is
`SECURITY INVOKER`, so these policies apply underneath it automatically — the
agent's tool never sees a gated chunk to begin with, regardless of how the
question is phrased. This is what makes it an infrastructure-level gate
rather than a prompt-level instruction the model could be talked out of.

## Real bugs this surfaced (live-tested, not just reasoned through)

Three genuine issues were found only by testing against a real database with
real RLS, not by reading the SQL:

1. **RLS-on-RLS recursion.** The first version of the `knowledge_chunks`
   policy checked `requires_verification` via `exists (select 1 from
   knowledge_sources where ...)` — but that subquery is itself filtered by
   `knowledge_sources`' own SELECT policy. For an unverified user, that
   policy already hides the source row, so the `exists` returned false and
   `not exists` became *vacuously true* — the opposite of intended. An
   unverified member could read sensitive chunk content directly even though
   the parent source was correctly hidden. Fixed with a `SECURITY DEFINER`
   helper (`source_requires_verification`) that bypasses the nested RLS,
   same pattern as the pre-existing `is_restricted_from`.
2. **Cross-organization approval.** `sensitive_access_approved` originally
   lived on `profiles` as a single global flag, guarded by a trigger that
   checked "is the caller an owner/admin *somewhere*, and is the target a
   member *somewhere*" — without requiring the same org. A user who owned
   their own unrelated workspace could "approve" themselves for a completely
   different org's sensitive data, just by being an owner of anything. Fixed
   by moving the flag onto `memberships` (inherently org-scoped) and
   rewriting the trigger to check one row, not a cross-org join.
3. **A DB function that can never see what it's asked to check.**
   `match_knowledge_chunks` bakes in `is_member_of(org_id)`, which reads
   `auth.uid()` — `NULL` on a service-role connection. The audit log's
   "would this sensitive source have matched, had it not been filtered"
   check called this same RPC via the service-role client to bypass RLS,
   and always got zero rows back, silently, regardless of org — denied
   attempts were never logged. Fixed with a dedicated
   `match_knowledge_chunks_unfiltered` function with no membership gate,
   locked to `service_role` only (`revoke ... from public, anon,
   authenticated`) so it can't become a bypass for a regular user calling it
   directly — verified by confirming a real authenticated user gets
   `permission denied` calling it.

## Known limitations

- **The Persona widget's `onComplete` callback is never trusted on its
  own** — it runs in the browser and can be faked with devtools open.
  `POST /api/identity/verify` re-asks Persona directly (`GET
  /inquiries/{id}`) for the real status before writing anything. Confirmed
  against a real, incomplete sandbox inquiry: the server correctly rejected
  it (`422`, `status: "created"`) rather than trusting the client's claim.
- **No webhook.** Production-grade Persona integrations confirm inquiry
  completion via webhook, not just a client-triggered server check. This
  build only does the latter — good enough to not trust the browser, not
  good enough to catch an inquiry that completes after the tab closes.
- **Verification is point-in-time.** Nothing here re-verifies a session is
  still the same human an hour later.
- **The full sandbox happy path (completing an actual biometric selfie
  check) wasn't driven end-to-end** — that needs a real camera/browser
  session this environment can't automate headlessly. Everything around it
  (server-side rejection of an incomplete inquiry, the RLS gate itself, the
  trigger, the audit log, the lockdown on the unfiltered match function) was
  verified directly against the live database and a real embedding.

## Env

`PERSONA_API_KEY`, `NEXT_PUBLIC_PERSONA_TEMPLATE_ID`,
`NEXT_PUBLIC_PERSONA_ENVIRONMENT_ID` — all optional. Without
`PERSONA_API_KEY`, `/api/identity/verify` always 502s, so nothing can ever
pass the gate and `requires_verification` sources just stay unreadable to
everyone (fails closed, not open).
