"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, MessageSquarePlus, Trash2 } from "lucide-react";
import clsx from "clsx";

interface ConversationRow {
  id: string;
  title: string;
  created_at: string;
}

export function ChatSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationRow[] | null>(null);
  const activeId = pathname.startsWith("/assistant/") ? pathname.split("/assistant/")[1] : null;

  useEffect(() => {
    const refresh = () =>
      fetch("/api/assistant/conversations")
        .then((res) => res.json())
        .then((data) => setConversations(data.conversations ?? []));

    refresh();
    window.addEventListener("productivai:conversation-updated", refresh);
    return () => window.removeEventListener("productivai:conversation-updated", refresh);
  }, [pathname]);

  async function deleteConversation(id: string) {
    setConversations((prev) => (prev ? prev.filter((c) => c.id !== id) : prev));
    await fetch(`/api/assistant/conversations/${id}`, { method: "DELETE" });
    if (id === activeId) router.push("/assistant");
  }

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] p-3">
      <Link
        href="/dashboard"
        className="flex items-center gap-2 rounded-[var(--radius)] px-2.5 py-2 text-[var(--text-sm)] text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--ink)]"
      >
        <LayoutGrid size={15} />
        Suite
      </Link>

      <button
        onClick={() => router.push("/assistant")}
        className="mt-3 flex items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] px-2.5 py-2 text-[var(--text-sm)] hover:bg-[var(--accent-soft)]"
      >
        <MessageSquarePlus size={15} />
        New chat
      </button>

      <div className="mt-4 flex-1 overflow-y-auto">
        <div className="px-2 text-[var(--text-xs)] font-medium uppercase tracking-wide text-[var(--muted)]">
          History
        </div>
        <div className="mt-1 flex flex-col gap-0.5">
          {conversations === null ? (
            <div className="px-2 py-2 text-[var(--text-xs)] text-[var(--muted)]">Loading…</div>
          ) : conversations.length === 0 ? (
            <div className="px-2 py-2 text-[var(--text-xs)] text-[var(--muted)]">No chats yet</div>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                className={clsx(
                  "group flex items-center rounded-[var(--radius-sm)] pr-1",
                  c.id === activeId
                    ? "bg-[var(--accent-soft)]"
                    : "hover:bg-[var(--accent-soft)]",
                )}
              >
                <Link
                  href={`/assistant/${c.id}`}
                  className={clsx(
                    "min-w-0 flex-1 truncate px-2 py-1.5 text-[var(--text-sm)]",
                    c.id === activeId ? "font-medium text-[var(--ink)]" : "text-[var(--muted)] group-hover:text-[var(--ink)]",
                  )}
                >
                  {c.title}
                </Link>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    deleteConversation(c.id);
                  }}
                  aria-label="Delete chat"
                  title="Delete chat"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--muted)] opacity-0 hover:text-[var(--danger)] group-hover:opacity-100"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
