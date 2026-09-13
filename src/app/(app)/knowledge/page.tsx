import { requireAuth } from "@/lib/auth/guard";
import { KnowledgeManager } from "@/components/knowledge/KnowledgeManager";

export const metadata = { title: "Knowledge" };

export default async function KnowledgePage() {
  const { role } = await requireAuth();
  return (
    <main className="p-8">
      <KnowledgeManager canMarkSensitive={role !== "member"} />
    </main>
  );
}
