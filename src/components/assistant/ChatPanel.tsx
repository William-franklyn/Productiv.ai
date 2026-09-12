"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ChatMessage } from "./ChatMessage";
import { EmptyState } from "./EmptyState";

export function ChatPanel({ conversationId }: { conversationId: string }) {
  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: "/api/assistant/chat",
        body: { conversationId },
      }),
  );
  const { messages, sendMessage, status, error } = useChat({ transport });
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const busy = status === "streaming" || status === "submitted";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function submit(text: string) {
    if (!text.trim()) return;
    sendMessage({ role: "user", parts: [{ type: "text", text }] });
    setInput("");
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <EmptyState onPick={submit} />
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-6">
            {messages.map((m) => (
              <ChatMessage key={m.id} message={m} />
            ))}
          </div>
        )}
        {error && (
          <p className="mx-auto max-w-2xl text-[var(--text-sm)] text-[var(--danger)]">
            {error.message}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="border-t border-[var(--border)] p-4"
      >
        <div className="mx-auto flex max-w-2xl gap-2">
          <input
            value={input}
            disabled={busy}
            onChange={(e) => setInput(e.target.value)}
            placeholder={busy ? "Waiting for a response…" : "Ask about your knowledge base, or ask for a chart…"}
            className="h-11 flex-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3.5 disabled:opacity-60"
          />
          <Button type="submit" disabled={busy || !input.trim()}>
            <Send size={16} />
          </Button>
        </div>
      </form>
    </div>
  );
}
