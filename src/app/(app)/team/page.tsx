import { requireAuth } from "@/lib/auth/guard";
import { TeamManager } from "@/components/team/TeamManager";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const { role } = await requireAuth();
  return (
    <main className="p-8">
      <TeamManager canManage={role !== "member"} />
    </main>
  );
}
