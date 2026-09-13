"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, MessageSquarePlus, Trash2 } from "lucide-react";

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
    window.addEventListener("irabu:conversation-updated", refresh);
    return () => window.removeEventListener("irabu:conversation-updated", refresh);
  }, [pathname]);

  async function deleteConversation(id: string) {
    setConversations((prev) => (prev ? prev.filter((c) => c.id !== id) : prev));
    await fetch(`/api/assistant/conversations/${id}`, { method: "DELETE" });
    if (id === activeId) router.push("/assistant");
  }

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg)] p-3">
      <div className="mb-3 px-2 py-1 text-[var(--text-md)] font-semibold tracking-tight">iRABU</div>

      <Link href="/dashboard" className="nav-row">
        <LayoutGrid size={15} className="shrink-0" />
        Suite
      </Link>

      <button
        onClick={() => router.push("/assistant")}
        className="mt-2 flex items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-[var(--text-sm)] font-medium transition-colors hover:border-[var(--border-strong)]"
      >
        <MessageSquarePlus size={15} className="shrink-0" />
        New chat
      </button>

      <div className="mt-5 flex min-h-0 flex-1 flex-col">
        <span className="eyebrow px-2">History</span>
        <div className="mt-1.5 flex flex-col gap-0.5 overflow-y-auto">
          {conversations === null ? (
            <div className="px-2 py-2 text-[var(--text-xs)] text-[var(--muted)]">Loading…</div>
          ) : conversations.length === 0 ? (
            <div className="px-2 py-2 text-[var(--text-xs)] text-[var(--muted)]">No chats yet</div>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                data-active={c.id === activeId}
                className="nav-row group pr-1"
              >
                <Link
                  href={`/assistant/${c.id}`}
                  className="min-w-0 flex-1 truncate py-0.5"
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
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--radius-sm)] opacity-0 transition-opacity hover:text-[var(--danger)] group-hover:opacity-100"
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
