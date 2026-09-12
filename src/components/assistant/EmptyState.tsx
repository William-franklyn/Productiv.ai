import { BarChart3, ListTodo, Search } from "lucide-react";

const starters = [
  { icon: Search, text: "What does our knowledge base say about our refund policy?" },
  { icon: BarChart3, text: "Chart Q1 vs Q2 revenue: Q1 42000, Q2 51000" },
  { icon: ListTodo, text: "Create a task: follow up with the design team by Friday" },
];

export function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 pt-24 text-center">
      <h2 className="text-lg font-medium">Ask ProductivAI anything</h2>
      <p className="max-w-sm text-[var(--text-sm)] text-[var(--muted)]">
        It can answer from your knowledge base with citations, create tasks, or
        turn numbers into a chart.
      </p>
      <div className="flex w-full flex-col gap-2">
        {starters.map((s) => (
          <button
            key={s.text}
            onClick={() => onPick(s.text)}
            className="flex items-center gap-2.5 rounded-[var(--radius)] border border-[var(--border)] px-3.5 py-2.5 text-left text-[var(--text-sm)] hover:bg-[var(--accent-soft)]"
          >
            <s.icon size={15} className="shrink-0 text-[var(--accent)]" />
            {s.text}
          </button>
        ))}
      </div>
    </div>
  );
}
