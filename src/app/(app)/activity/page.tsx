import { ActivityFeed } from "@/components/ActivityFeed";

export const metadata = { title: "Activity" };

export default function ActivityPage() {
  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">Activity</h1>
      <p className="mt-1 text-[var(--text-sm)] text-[var(--muted)]">
        Everything that's changed in this workspace, in one append-only feed.
      </p>
      <div className="mt-6">
        <ActivityFeed />
      </div>
    </main>
  );
}
