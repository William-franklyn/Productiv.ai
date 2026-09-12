import { TeamManager } from "@/components/team/TeamManager";

export const metadata = { title: "Team" };

export default function TeamPage() {
  return (
    <main className="p-8">
      <TeamManager />
    </main>
  );
}
