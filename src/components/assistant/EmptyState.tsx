import { BarChart3, ListTodo, Search } from "lucide-react";

const starters = [
  { icon: Search, text: "What does our knowledge base say about our refund policy?" },
  { icon: BarChart3, text: "Chart Q1 vs Q2 revenue: Q1 42000, Q2 51000" },
  { icon: ListTodo, text: "Create a task: follow up with the design team by Friday" },
];

export function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 pt-24 text-center">
      <div>
        <h2 className="text-[var(--text-xl)] font-semibold">Ask iRABU anything</h2>
        <p className="mx-auto mt-2 max-w-md text-[var(--text-md)] text-[var(--muted)]">
          It answers from your workspace with citations, creates tasks, drafts
          email, and turns numbers into charts — every answer says where it
          came from.
        </p>
      </div>
      <div className="flex w-full flex-col gap-1.5">
        {starters.map((s) => (
          <button
            key={s.text}
            onClick={() => onPick(s.text)}
            className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-left text-[var(--text-sm)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-sunken)]"
          >
            <s.icon size={15} className="shrink-0 text-[var(--muted)]" />
            {s.text}
          </button>
        ))}
      </div>
    </div>
  );
}
