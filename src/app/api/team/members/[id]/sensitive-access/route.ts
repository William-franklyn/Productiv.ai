import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthApi } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({ approved: z.boolean() });

// Owner/admin only — verification (Persona) proves someone's a real human,
// this is the separate "may they see THIS org's most sensitive sources"
// grant. Lives on memberships, not profiles: a user can belong to more than
// one org, and approval in one has nothing to do with another — an earlier
// version of this lived on profiles as a single global flag, which let a
// user who owned an unrelated workspace "approve" themselves for a
// completely different org's sensitive data (found by live testing).
//
// memberships has no UPDATE policy for the authenticated role at all (only
// select), so this has to go through the service-role client like every
// other membership mutation in this app (e.g. signup bootstrap) — the
// auth.role check above is what makes that safe. The database trigger
// (034/036_*.sql) is the defense-in-depth layer: it trusts a service-role
// write (no JWT, so nothing to check) but blocks a direct, RLS-scoped write
// using someone's own session unless they're actually an owner/admin of
// that specific organization — which is what a member trying to self-approve
// by calling Supabase directly would look like.

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role === "member") {
    return NextResponse.json({ error: "Only owners and admins can approve sensitive access" }, { status: 403 });
  }

  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("memberships")
    .update({ sensitive_access_approved: parsed.data.approved })
    .eq("organization_id", auth.orgId)
    .eq("user_id", id)
    .select("user_id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
