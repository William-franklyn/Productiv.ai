import { requireAuth } from "@/lib/auth/guard";
import { Card } from "@/components/ui/Card";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { fullName, orgName } = await requireAuth();

  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">
        Welcome{fullName ? `, ${fullName.split(" ")[0]}` : ""}
      </h1>
      <p className="mt-1 text-[var(--text-sm)] text-[var(--muted)]">
        {orgName}
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-[var(--text-sm)] text-[var(--muted)]">Knowledge sources</p>
          <p className="mt-2 text-2xl font-semibold">0</p>
        </Card>
        <Card className="p-5">
          <p className="text-[var(--text-sm)] text-[var(--muted)]">Conversations</p>
          <p className="mt-2 text-2xl font-semibold">0</p>
        </Card>
        <Card className="p-5">
          <p className="text-[var(--text-sm)] text-[var(--muted)]">Open tasks</p>
          <p className="mt-2 text-2xl font-semibold">0</p>
        </Card>
      </div>
    </main>
  );
}
