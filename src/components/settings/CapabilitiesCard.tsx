import { BarChart3, ListTodo, Search } from "lucide-react";
import { Card } from "@/components/ui/Card";

const capabilities = [
  {
    icon: Search,
    title: "search_knowledge",
    body: "Reads passages from documents uploaded to this workspace. Cannot see other workspaces.",
  },
  {
    icon: ListTodo,
    title: "create_task",
    body: "Adds a task to this workspace's task list. Never modifies or deletes existing tasks on its own.",
  },
  {
    icon: BarChart3,
    title: "generate_chart",
    body: "Renders a chart or stat tile from data in the conversation. Performs no lookups of its own.",
  },
];

export function CapabilitiesCard() {
  return (
    <Card className="p-5">
      <h3 className="text-[var(--text-base)] font-medium">Assistant capabilities</h3>
      <p className="mt-1 text-[var(--text-sm)] text-[var(--muted)]">
        The assistant has exactly three tools, and nothing beyond them — no web
        access, no email, no reach outside this workspace.
      </p>
      <div className="mt-4 flex flex-col gap-3">
        {capabilities.map((c) => (
          <div key={c.title} className="flex gap-3">
            <c.icon size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />
            <div>
              <p className="font-mono text-[var(--text-sm)]">{c.title}</p>
              <p className="text-[var(--text-sm)] text-[var(--muted)]">{c.body}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
