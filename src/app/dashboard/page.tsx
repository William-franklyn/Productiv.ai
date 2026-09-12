import { requireAuth } from "@/lib/auth/guard";

export default async function DashboardPage() {
  const { fullName } = await requireAuth();

  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">
        Welcome{fullName ? `, ${fullName}` : ""}
      </h1>
      <p className="mt-2 text-[var(--text-sm)] text-[var(--muted)]">
        The dashboard shell is next.
      </p>
    </main>
  );
}
