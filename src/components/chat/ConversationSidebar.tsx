import { Plus } from "lucide-react";
import clsx from "clsx";

export interface ConversationSummary {
  id: string;
  title: string;
  mode: "chat" | "search";
  created_at: string;
}

export function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
}: {
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <aside className="flex w-64 flex-col border-r border-[var(--border)]">
      <div className="p-3">
        <button
          onClick={onNew}
          className="flex w-full items-center justify-center gap-1.5 rounded-[var(--radius)] border border-[var(--border)] py-2 text-[var(--text-sm)] hover:bg-[var(--accent-soft)]"
        >
          <Plus size={14} />
          New chat
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={clsx(
              "block w-full truncate rounded-[var(--radius)] px-2.5 py-2 text-left text-[var(--text-sm)]",
              activeId === c.id
                ? "bg-[var(--accent-soft)] font-medium"
                : "text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--ink)]",
            )}
          >
            {c.title}
          </button>
        ))}
      </nav>
    </aside>
  );
}
