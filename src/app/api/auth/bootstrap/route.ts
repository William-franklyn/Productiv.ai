import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  fullName: z.string().min(1).max(120),
  orgName: z.string().min(1).max(120).optional(),
  inviteToken: z.string().optional(),
});

// Runs once, right after a client-side signUp. Creates the organization (or
// redeems an invite into an existing one) and the profile row. This has to
// happen with the service-role key: there is no insert policy on
// `organizations` / `profiles` for the authenticated role by design, so a
// user can never create a profile that points at an org they weren't
// assigned to.
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

  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (existing) {
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
    organization_id: organizationId,
    full_name: fullName,
    role,
  });

  if (profileError) {
    return NextResponse.json(
      { error: "Could not create profile" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
