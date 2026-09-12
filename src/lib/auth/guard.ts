import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AuthContext {
  userId: string;
  orgId: string;
  orgName: string;
  role: "owner" | "admin" | "member";
  fullName: string | null;
}

type ProfileRow = {
  organization_id: string;
  role: "owner" | "admin" | "member";
  full_name: string | null;
  organizations: { name: string } | { name: string }[] | null;
};

function toAuthContext(userId: string, profile: ProfileRow): AuthContext {
  const org = Array.isArray(profile.organizations)
    ? profile.organizations[0]
    : profile.organizations;

  return {
    userId,
    orgId: profile.organization_id,
    orgName: org?.name ?? "Workspace",
    role: profile.role,
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

  return toAuthContext(user.id, profile as ProfileRow);
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

  return toAuthContext(user.id, profile as ProfileRow);
}
