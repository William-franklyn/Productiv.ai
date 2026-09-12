import { requireAuth } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { fullName, orgName, orgId } = await requireAuth();
  const supabase = await createClient();

  const [sources, conversations, openTasks] = await Promise.all([
    supabase
      .from("knowledge_sources")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId),
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "open"),
  ]);

  const stats = [
    { label: "Knowledge sources", value: sources.count ?? 0 },
    { label: "Conversations", value: conversations.count ?? 0 },
    { label: "Open tasks", value: openTasks.count ?? 0 },
  ];

  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">
        Welcome{fullName ? `, ${fullName.split(" ")[0]}` : ""}
      </h1>
      <p className="mt-1 text-[var(--text-sm)] text-[var(--muted)]">{orgName}</p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-[var(--text-sm)] text-[var(--muted)]">{s.label}</p>
            <p className="tabular-nums mt-2 text-2xl font-semibold">{s.value}</p>
          </Card>
        ))}
      </div>
    </main>
  );
}
