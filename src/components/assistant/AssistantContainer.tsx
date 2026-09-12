"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { UIMessage } from "ai";
import { ChatPanel } from "./ChatPanel";

export function AssistantContainer({ conversationId }: { conversationId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<UIMessage[] | null>(null);

  useEffect(() => {
    if (!conversationId) {
      const query = searchParams.toString();
      fetch("/api/assistant/conversations", { method: "POST" })
        .then((res) => res.json())
        .then((body) => router.replace(`/assistant/${body.id}${query ? `?${query}` : ""}`));
      return;
    }
    setMessages(null);
    fetch(`/api/assistant/conversations/${conversationId}/messages`)
      .then((res) => res.json())
      .then((body) => setMessages(body.messages ?? []));
  }, [conversationId, router]);

  if (!conversationId || messages === null) {
    return (
      <div className="flex h-screen items-center justify-center text-[var(--muted)]">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }

  return <ChatPanel key={conversationId} conversationId={conversationId} initialMessages={messages} />;
}
