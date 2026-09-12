"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ChatPanel } from "./ChatPanel";

export function AssistantContainer() {
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/assistant/conversations", { method: "POST" })
      .then((res) => res.json())
      .then((body) => setConversationId(body.id));
  }, []);

  if (!conversationId) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center text-[var(--muted)]">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }

  return <ChatPanel conversationId={conversationId} />;
}
