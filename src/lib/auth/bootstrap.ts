import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Creates the organization (or redeems an invite into an existing one) plus
 * the profile row and first membership for a user who's authenticated but
 * has no workspace yet. Has to run with the service-role key: there is no
 * insert policy on organizations/profiles/memberships for the authenticated
 * role by design, so a user can never grant themselves membership in
 * something the server didn't decide on.
 *
 * Called from two places: immediately after signup when Supabase returns a
 * session right away, and — when email confirmation is required and no
 * session comes back at signup time — lazily the next time this now-confirmed
 * user is resolved by requireAuth/requireAuthApi, using the fullName/orgName/
 * inviteToken stashed in their auth user_metadata at signup. See
 * src/lib/auth/guard.ts's ensureBootstrapped.
 */
export async function completeBootstrap(params: {
  userId: string;
  fullName: string;
  orgName?: string;
  inviteToken?: string;
}): Promise<{ ok: true; organizationId: string } | { ok: false; error: string }> {
  const { userId, fullName, orgName, inviteToken } = params;
  const admin = createAdminClient();

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (existingProfile) {
    return { ok: false, error: "Already onboarded" };
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
      return { ok: false, error: "Invite is invalid or already used" };
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
      return { ok: false, error: "Could not create organization" };
    }
    organizationId = org.id;
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: userId,
    full_name: fullName,
  });
  if (profileError) {
    return { ok: false, error: "Could not create profile" };
  }

  const { error: membershipError } = await admin.from("memberships").insert({
    user_id: userId,
    organization_id: organizationId,
    role,
  });
  if (membershipError) {
    return { ok: false, error: "Could not create membership" };
  }

  return { ok: true, organizationId };
}
