"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, MessageSquarePlus } from "lucide-react";
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
    fetch("/api/assistant/conversations")
      .then((res) => res.json())
      .then((data) => setConversations(data.conversations ?? []));
  }, [pathname]);

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
        <div className="px-2 text-[var(--text-2xs)] font-medium uppercase tracking-wide text-[var(--muted)]">
          History
        </div>
        <div className="mt-1 flex flex-col gap-0.5">
          {conversations === null ? (
            <div className="px-2 py-2 text-[var(--text-xs)] text-[var(--muted)]">Loading…</div>
          ) : conversations.length === 0 ? (
            <div className="px-2 py-2 text-[var(--text-xs)] text-[var(--muted)]">No chats yet</div>
          ) : (
            conversations.map((c) => (
              <Link
                key={c.id}
                href={`/assistant/${c.id}`}
                className={clsx(
                  "truncate rounded-[var(--radius-sm)] px-2 py-1.5 text-[var(--text-sm)]",
                  c.id === activeId
                    ? "bg-[var(--accent-soft)] font-medium text-[var(--ink)]"
                    : "text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--ink)]",
                )}
              >
                {c.title}
              </Link>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
