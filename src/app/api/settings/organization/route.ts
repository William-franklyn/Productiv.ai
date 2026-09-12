import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthApi } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";

const bodySchema = z.object({ name: z.string().min(1).max(120) });

export async function PATCH(req: NextRequest) {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role === "member") {
    return NextResponse.json(
      { error: "Only owners and admins can rename the workspace" },
      { status: 403 },
    );
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({ name: parsed.data.name })
    .eq("id", auth.orgId);

  if (error) return NextResponse.json({ error: "Could not save" }, { status: 500 });

  await logActivity(supabase, {
    organizationId: auth.orgId,
    actorId: auth.userId,
    action: "renamed_workspace",
    detail: `Renamed workspace to ${parsed.data.name}`,
  });

  return NextResponse.json({ ok: true });
}
