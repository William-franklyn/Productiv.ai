import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthApi } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const [{ data: tasks, error }, { data: memberRows }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, status, due_date, assigned_to, created_at")
      .eq("organization_id", auth.orgId)
      .order("created_at", { ascending: false }),
    supabase
      .from("memberships")
      .select("user_id, profiles(full_name)")
      .eq("organization_id", auth.orgId),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const nameById = new Map(
    (memberRows ?? []).map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return [row.user_id, profile?.full_name ?? "Unnamed member"];
    }),
  );

  return NextResponse.json({
    tasks: (tasks ?? []).map((t) => ({
      ...t,
      assigneeName: t.assigned_to ? nameById.get(t.assigned_to) ?? null : null,
    })),
  });
}

const createSchema = z.object({
  title: z.string().min(1).max(300),
  dueDate: z.string().optional(),
  assignedTo: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      organization_id: auth.orgId,
      created_by: auth.userId,
      title: parsed.data.title,
      due_date: parsed.data.dueDate ?? null,
      assigned_to: parsed.data.assignedTo ?? null,
    })
    .select("id")
    .single();

  if (error || !data) return NextResponse.json({ error: "Could not create task" }, { status: 500 });

  await logActivity(supabase, {
    organizationId: auth.orgId,
    actorId: auth.userId,
    action: "created_task",
    detail: `Created task: ${parsed.data.title}`,
  });

  return NextResponse.json({ id: data.id }, { status: 201 });
}
