"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ConversationSidebar, type ConversationSummary } from "./ConversationSidebar";
import { ChatSurface } from "./ChatSurface";

export function ChatShell({ orgName }: { orgName: string }) {
  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/chat/conversations");
    const body = await res.json();
    setConversations(body.conversations);
    return body.conversations as ConversationSummary[];
  }, []);

  useEffect(() => {
    refresh().then((list) => {
      if (list.length > 0) setActiveId(list[0].id);
    });
  }, [refresh]);

  async function onNew() {
    const res = await fetch("/api/chat/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "chat" }),
    });
    const body = await res.json();
    await refresh();
    setActiveId(body.conversation.id);
  }

  async function onModeChange(mode: "chat" | "search") {
    if (!activeId) return;
    setConversations((prev) =>
      prev ? prev.map((c) => (c.id === activeId ? { ...c, mode } : c)) : prev,
    );
    await fetch(`/api/chat/conversations/${activeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
  }

  if (!conversations) {
    return (
      <div className="flex flex-1 items-center justify-center text-[var(--muted)]">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }

  const active = conversations.find((c) => c.id === activeId) ?? null;

  return (
    <div className="flex flex-1">
      <ConversationSidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={onNew}
      />
      {active ? (
        <ChatSurface
          conversation={active}
          orgName={orgName}
          onModeChange={onModeChange}
          onExchangeComplete={refresh}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center text-[var(--text-sm)] text-[var(--muted)]">
          Start a new chat to ask your knowledge base a question.
        </div>
      )}
    </div>
  );
}
