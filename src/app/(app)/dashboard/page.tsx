import Link from "next/link";
import { CalendarClock, ListTodo } from "lucide-react";
import { requireAuth } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveBalance } from "@/lib/nessie/balance";
import { Card } from "@/components/ui/Card";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { fullName, orgName, orgId, userId } = await requireAuth();
  const supabase = await createClient();

  const [sources, conversations, openTasks, upcomingMeetings, myTasks, financeConnection] = await Promise.all([
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
    supabase
      .from("meetings")
      .select("id, title, starts_at, duration_minutes")
      .eq("organization_id", orgId)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(5),
    supabase
      .from("tasks")
      .select("id, title, due_date")
      .eq("organization_id", orgId)
      .eq("assigned_to", userId)
      .eq("status", "open")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(5),
    supabase
      .from("nessie_connections")
      .select("account_id, nickname")
      .eq("organization_id", orgId)
      .maybeSingle(),
  ]);

  let balance: { nickname: string; amount: number } | null = null;
  if (financeConnection.data) {
    try {
      const effective = await getEffectiveBalance(supabase, orgId, financeConnection.data.account_id);
      balance = { nickname: effective.nickname, amount: effective.balance };
    } catch {
      // Nessie unreachable — just omit the widget rather than break the page.
    }
  }

  const stats = [
    { label: "Knowledge sources", value: sources.count ?? 0 },
    { label: "Conversations", value: conversations.count ?? 0 },
    { label: "Open tasks", value: openTasks.count ?? 0 },
    ...(balance ? [{ label: balance.nickname, value: `$${balance.amount.toFixed(2)}` }] : []),
  ];

  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">
        Welcome{fullName ? `, ${fullName.split(" ")[0]}` : ""}
      </h1>
      <p className="mt-1 text-[var(--text-sm)] text-[var(--muted)]">{orgName}</p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-[var(--text-sm)] text-[var(--muted)]">{s.label}</p>
            <p className="tabular-nums mt-2 text-2xl font-semibold">{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[var(--text-base)] font-medium">
              <CalendarClock size={16} className="text-[var(--accent)]" />
              Upcoming meetings
            </h2>
            <Link href="/automations" className="text-[var(--text-xs)] text-[var(--muted)] hover:text-[var(--ink)]">
              View all
            </Link>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {(upcomingMeetings.data ?? []).length === 0 ? (
              <p className="text-[var(--text-sm)] text-[var(--muted)]">Nothing scheduled.</p>
            ) : (
              upcomingMeetings.data!.map((m) => (
                <div key={m.id} className="flex items-center justify-between text-[var(--text-sm)]">
                  <span className="truncate">{m.title}</span>
                  <span className="shrink-0 text-[var(--text-xs)] text-[var(--muted)]">
                    {new Date(m.starts_at).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[var(--text-base)] font-medium">
              <ListTodo size={16} className="text-[var(--accent)]" />
              Your tasks
            </h2>
            <Link href="/automations" className="text-[var(--text-xs)] text-[var(--muted)] hover:text-[var(--ink)]">
              View all
            </Link>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {(myTasks.data ?? []).length === 0 ? (
              <p className="text-[var(--text-sm)] text-[var(--muted)]">Nothing assigned to you.</p>
            ) : (
              myTasks.data!.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-[var(--text-sm)]">
                  <span className="truncate">{t.title}</span>
                  {t.due_date && (
                    <span className="shrink-0 text-[var(--text-xs)] text-[var(--muted)]">{t.due_date}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
