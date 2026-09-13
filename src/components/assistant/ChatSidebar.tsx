"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, MessageSquarePlus, Trash2 } from "lucide-react";
import { Wordmark } from "@/components/ui/Logo";

interface ConversationRow {
  id: string;
  title: string;
  created_at: string;
}

export function ChatSidebar({
  mobileOpen = false,
  onCloseMobile,
}: {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}) {
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

  // Escape closes the drawer, and the page behind it stops scrolling.
  useEffect(() => {
    if (!mobileOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseMobile?.();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [mobileOpen, onCloseMobile]);

  const body = (
    <>
      <Wordmark size={18} className="mb-3 px-2 py-1" />

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
                  onClick={onCloseMobile}
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
                  // Always visible on touch, where there is no hover to reveal it.
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--radius-sm)] transition-opacity hover:text-[var(--danger)] md:opacity-0 md:group-hover:opacity-100"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* h-full, not h-screen — AssistantShell's root already sets the
          viewport height, and this sits inside it. */}
      <aside className="hidden h-full w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg)] p-3 md:flex">
        {body}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-[var(--scrim)]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Chat history"
            className="absolute inset-y-0 left-0 flex w-64 max-w-[82vw] flex-col border-r border-[var(--border)] bg-[var(--bg)] p-3 shadow-[var(--shadow-lg)]"
          >
            {body}
          </aside>
        </div>
      )}
    </>
  );
}
