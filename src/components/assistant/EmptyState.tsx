import { BarChart3, ListTodo, Search, Sparkles } from "lucide-react";

const starters = [
  { icon: Search, text: "What does our knowledge base say about our refund policy?" },
  { icon: BarChart3, text: "Chart Q1 vs Q2 revenue: Q1 42000, Q2 51000" },
  { icon: ListTodo, text: "Create a task: follow up with the design team by Friday" },
];

export function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 pt-20 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)]">
        <Sparkles size={18} className="text-[var(--accent)]" />
      </div>
      <div>
        <h2 className="text-lg font-medium">Ask iRABU anything</h2>
        <p className="mt-1.5 max-w-sm text-[var(--text-sm)] text-[var(--muted)]">
          It answers from your knowledge base with citations, creates tasks, or
          turns numbers into a chart — every answer says where it came from.
        </p>
      </div>
      <div className="mt-2 flex w-full flex-col gap-2">
        {starters.map((s) => (
          <button
            key={s.text}
            onClick={() => onPick(s.text)}
            className="flex items-center gap-2.5 rounded-[var(--radius)] border border-[var(--border)] px-3.5 py-2.5 text-left text-[var(--text-sm)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
          >
            <s.icon size={15} className="shrink-0 text-[var(--accent)]" />
            {s.text}
          </button>
        ))}
      </div>
    </div>
  );
}
