import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { requireAuthApi, ACTIVE_ORG_COOKIE } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ memberships: auth.memberships, activeOrgId: auth.orgId });
}

const bodySchema = z.object({ name: z.string().min(1).max(120) });

// Creating a workspace has to go through the service-role key: there is no
// insert policy on organizations/memberships for the authenticated role, by
// the same design as the very first signup path in 001 — a user can never
// grant themselves membership in something the server didn't decide on.
export async function POST(req: NextRequest) {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ name: parsed.data.name })
    .select("id, name")
    .single();

  if (orgError || !org) {
    return NextResponse.json({ error: "Could not create workspace" }, { status: 500 });
  }

  const { error: membershipError } = await admin.from("memberships").insert({
    user_id: auth.userId,
    organization_id: org.id,
    role: "owner",
  });

  if (membershipError) {
    return NextResponse.json({ error: "Could not create workspace" }, { status: 500 });
  }

  const store = await cookies();
  store.set(ACTIVE_ORG_COOKIE, org.id, { path: "/", httpOnly: true, sameSite: "lax" });

  return NextResponse.json({ id: org.id, name: org.name }, { status: 201 });
}
