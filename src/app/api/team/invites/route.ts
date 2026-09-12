import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { requireAuthApi } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";

const bodySchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"]).default("member"),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role === "member") {
    return NextResponse.json({ error: "Only owners and admins can invite" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const supabase = await createClient();
  const token = randomBytes(24).toString("base64url");

  const { data, error } = await supabase
    .from("org_invites")
    .insert({
      organization_id: auth.orgId,
      email: parsed.data.email,
      role: parsed.data.role,
      token,
      created_by: auth.userId,
    })
    .select("id, email, role, token, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not create invite" }, { status: 500 });
  }

  await logActivity(supabase, {
    organizationId: auth.orgId,
    actorId: auth.userId,
    action: "invited_teammate",
    detail: `Invited ${parsed.data.email}`,
  });

  return NextResponse.json({ invite: data }, { status: 201 });
}
