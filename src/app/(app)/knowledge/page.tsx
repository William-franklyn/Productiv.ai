import { KnowledgeManager } from "@/components/knowledge/KnowledgeManager";

export const metadata = { title: "Knowledge" };

export default function KnowledgePage() {
  return (
    <main className="p-8">
      <KnowledgeManager />
    </main>
  );
}
