import { NextRequest, NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = await createClient();

  const { data: meeting } = await supabase
    .from("meetings")
    .select("title")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("meetings").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (meeting) {
    await logActivity(supabase, {
      organizationId: auth.orgId,
      actorId: auth.userId,
      action: "cancelled_meeting",
      detail: `Cancelled meeting: ${meeting.title}`,
    });
  }

  return NextResponse.json({ ok: true });
}
