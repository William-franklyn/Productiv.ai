import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AuthContext {
  userId: string;
  orgId: string;
  role: "owner" | "admin" | "member";
  fullName: string | null;
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
    .select("organization_id, role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/signup");

  return {
    userId: user.id,
    orgId: profile.organization_id,
    role: profile.role,
    fullName: profile.full_name,
  };
}

export async function requireAuthApi(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role, full_name")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  return {
    userId: user.id,
    orgId: profile.organization_id,
    role: profile.role,
    fullName: profile.full_name,
  };
}
