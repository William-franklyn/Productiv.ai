import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ACTIVE_ORG_COOKIE } from "@/lib/auth/guard";

const bodySchema = z.object({
  fullName: z.string().min(1).max(120),
  // Empty string, not just undefined — the signup form always sends this
  // key, it just hides the input (and leaves it "") when an invite token is
  // present, since the workspace is decided by the invite instead.
  orgName: z.string().max(120).optional(),
  inviteToken: z.string().optional(),
});

// Runs once, right after a client-side signUp. Creates the organization (or
// redeems an invite into an existing one) plus the profile row and the first
// membership. This has to happen with the service-role key: there is no
// insert policy on organizations/profiles/memberships for the authenticated
// role by design, so a user can never grant themselves membership in
// something the server didn't decide on.
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
  const { fullName, orgName, inviteToken } = parsed.data;

  const admin = createAdminClient();

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (existingProfile) {
    return NextResponse.json({ error: "Already onboarded" }, { status: 409 });
  }

  let organizationId: string;
  let role: "owner" | "member" = "owner";

  if (inviteToken) {
    const { data: invite } = await admin
      .from("org_invites")
      .select("id, organization_id, role, redeemed_at")
      .eq("token", inviteToken)
      .maybeSingle();

    if (!invite || invite.redeemed_at) {
      return NextResponse.json(
        { error: "Invite is invalid or already used" },
        { status: 400 },
      );
    }

    organizationId = invite.organization_id;
    role = invite.role as "member";

    await admin
      .from("org_invites")
      .update({ redeemed_at: new Date().toISOString() })
      .eq("id", invite.id);
  } else {
    const { data: org, error: orgError } = await admin
      .from("organizations")
      .insert({ name: orgName?.trim() || `${fullName}'s workspace` })
      .select("id")
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: "Could not create organization" },
        { status: 500 },
      );
    }
    organizationId = org.id;
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: user.id,
    full_name: fullName,
  });
  if (profileError) {
    return NextResponse.json({ error: "Could not create profile" }, { status: 500 });
  }

  const { error: membershipError } = await admin.from("memberships").insert({
    user_id: user.id,
    organization_id: organizationId,
    role,
  });
  if (membershipError) {
    return NextResponse.json({ error: "Could not create membership" }, { status: 500 });
  }

  const store = await cookies();
  store.set(ACTIVE_ORG_COOKIE, organizationId, { path: "/", httpOnly: true, sameSite: "lax" });

  return NextResponse.json({ ok: true });
}
