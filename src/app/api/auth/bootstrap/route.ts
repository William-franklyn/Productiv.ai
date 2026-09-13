import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { completeBootstrap } from "@/lib/auth/bootstrap";
import { ACTIVE_ORG_COOKIE } from "@/lib/auth/guard";

const bodySchema = z.object({
  fullName: z.string().min(1).max(120),
  // Empty string, not just undefined — the signup form always sends this
  // key, it just hides the input (and leaves it "") when an invite token is
  // present, since the workspace is decided by the invite instead.
  orgName: z.string().max(120).optional(),
  inviteToken: z.string().optional(),
});

// Runs once, right after a client-side signUp — only when Supabase returns a
// session immediately (i.e. email confirmation is off). When confirmation is
// required, this never fires at all; see ensureBootstrapped in
// src/lib/auth/guard.ts for the deferred path that handles that case using
// the same fullName/orgName/inviteToken stashed as signup metadata.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const result = await completeBootstrap({ userId: user.id, ...parsed.data });
  if (!result.ok) {
    const status = result.error === "Already onboarded" ? 409 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  const store = await cookies();
  store.set(ACTIVE_ORG_COOKIE, result.organizationId, { path: "/", httpOnly: true, sameSite: "lax" });

  return NextResponse.json({ ok: true });
}
