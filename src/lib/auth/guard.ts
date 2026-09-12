import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const VIEW_AS_COOKIE = "view_as_role";
type Role = "owner" | "admin" | "member";
const ROLE_RANK: Record<Role, number> = { owner: 2, admin: 1, member: 0 };

export interface AuthContext {
  userId: string;
  orgId: string;
  orgName: string;
  role: Role;
  realRole: Role;
  viewingAs: boolean;
  fullName: string | null;
}

type ProfileRow = {
  organization_id: string;
  role: "owner" | "admin" | "member";
  full_name: string | null;
  organizations: { name: string } | { name: string }[] | null;
};

async function resolveRole(realRole: Role): Promise<{ role: Role; viewingAs: boolean }> {
  const store = await cookies();
  const previewed = store.get(VIEW_AS_COOKIE)?.value as Role | undefined;

  // Only a real owner/admin can preview a role, and only a *lower* one —
  // this changes what the UI shows them, never what profiles.role actually
  // says, so it can't be used to escalate privilege for anyone, including
  // whoever set the cookie.
  if (previewed && previewed in ROLE_RANK && ROLE_RANK[previewed] < ROLE_RANK[realRole]) {
    return { role: previewed, viewingAs: true };
  }
  return { role: realRole, viewingAs: false };
}

async function toAuthContext(userId: string, profile: ProfileRow): Promise<AuthContext> {
  const org = Array.isArray(profile.organizations)
    ? profile.organizations[0]
    : profile.organizations;
  const { role, viewingAs } = await resolveRole(profile.role);

  return {
    userId,
    orgId: profile.organization_id,
    orgName: org?.name ?? "Workspace",
    role,
    realRole: profile.role,
    viewingAs,
    fullName: profile.full_name,
  };
}

/**
 * Resolves the signed-in user's org/role for a server component or route
 * handler. Redirects to /login if there's no session — callers in route
 * handlers that need a 401 instead should use `requireAuthApi`.
 */
export async function requireAuth(): Promise<AuthContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role, full_name, organizations(name)")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/signup");

  return await toAuthContext(user.id, profile as ProfileRow);
}

export async function requireAuthApi(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role, full_name, organizations(name)")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  return await toAuthContext(user.id, profile as ProfileRow);
}
