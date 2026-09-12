"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ModeSelector } from "./ModeSelector";
import { ChatMessageRow, type DisplayMessage } from "./ChatMessageRow";
import { RightPanel } from "./RightPanel";
import { getText, getOrderedChunks, isToolPending } from "@/lib/ai/message-parts";
import type { CitedChunk } from "@/lib/chat/citations";
import type { ConversationSummary } from "./ConversationSidebar";

export function ChatSurface({
  conversation,
  orgName,
  onModeChange,
  onExchangeComplete,
}: {
  conversation: ConversationSummary;
  orgName: string;
  onModeChange: (mode: "chat" | "search") => void;
  onExchangeComplete: () => void;
}) {
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(null);
  const [historyChunks, setHistoryChunks] = useState<Record<string, CitedChunk[]>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    fetch(`/api/chat/conversations/${conversation.id}`)
      .then((r) => r.json())
      .then((body: { messages: { id: string; role: "user" | "assistant"; content: string; citations: CitedChunk[] }[] }) => {
        if (cancelled) return;
        const msgs: UIMessage[] = body.messages.map((m) => ({
          id: m.id,
          role: m.role,
          parts: [{ type: "text", text: m.content }],
        }));
        const chunkMap: Record<string, CitedChunk[]> = {};
        for (const m of body.messages) {
          if (m.role === "assistant" && m.citations?.length) chunkMap[m.id] = m.citations;
        }
        setInitialMessages(msgs);
        setHistoryChunks(chunkMap);
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [conversation.id]);

  if (!loaded || initialMessages === null) {
    return (
      <div className="flex flex-1 items-center justify-center text-[var(--muted)]">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }

  return (
    <ChatSurfaceInner
      key={conversation.id}
      conversation={conversation}
      orgName={orgName}
      onModeChange={onModeChange}
      onExchangeComplete={onExchangeComplete}
      seedMessages={initialMessages}
      historyChunks={historyChunks}
    />
  );
}

function ChatSurfaceInner({
  conversation,
  orgName,
  onModeChange,
  onExchangeComplete,
  seedMessages,
  historyChunks,
}: {
  conversation: ConversationSummary;
  orgName: string;
  onModeChange: (mode: "chat" | "search") => void;
  onExchangeComplete: () => void;
  seedMessages: UIMessage[];
  historyChunks: Record<string, CitedChunk[]>;
}) {
  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { conversationId: conversation.id },
      }),
  );
  const { messages, sendMessage, status, error } = useChat({
    id: conversation.id,
    transport,
    messages: seedMessages,
  });
  const [input, setInput] = useState("");
  const [activeCitation, setActiveCitation] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const busy = status === "streaming" || status === "submitted";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // The title is set server-side from the first message; refresh the
  // sidebar once that exchange finishes so it doesn't sit stale as
  // "New conversation" until some unrelated navigation happens.
  useEffect(() => {
    if (status === "ready" && seedMessages.length === 0 && messages.length === 2) {
      onExchangeComplete();
    }
  }, [status, messages.length, seedMessages.length, onExchangeComplete]);

  const displayMessages: DisplayMessage[] = messages.map((m) => ({
    id: m.id,
    role: m.role === "user" ? "user" : "assistant",
    text: getText(m),
    chunks: historyChunks[m.id] ?? getOrderedChunks(m),
  }));

  const lastAssistant = [...displayMessages].reverse().find((m) => m.role === "assistant");
  const sources = lastAssistant?.chunks ?? [];

  const lastLiveMessage = messages[messages.length - 1];
  const pendingLabel =
    lastLiveMessage?.role === "assistant" ? isToolPending(lastLiveMessage) : null;

  function submit(text: string) {
    if (!text.trim() || busy) return;
    sendMessage({ role: "user", parts: [{ type: "text", text }] });
    setInput("");
  }

  function onCiteClick(n: number) {
    setActiveCitation(n - 1);
    document.getElementById(`source-${n}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="flex flex-1">
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-3">
          <h1 className="text-[var(--text-base)] font-medium">{conversation.title}</h1>
          <ModeSelector
            mode={conversation.mode}
            locked={messages.length > 0}
            onChange={onModeChange}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto flex max-w-2xl flex-col gap-6">
            {displayMessages.length === 0 && (
              <p className="pt-16 text-center text-[var(--text-sm)] text-[var(--muted)]">
                Ask a question — every answer cites exactly where it came from.
              </p>
            )}
            {displayMessages.map((m) => (
              <ChatMessageRow key={m.id} message={m} onCiteClick={onCiteClick} />
            ))}
            {pendingLabel && (
              <div className="flex items-center gap-2 text-[var(--text-sm)] text-[var(--muted)]">
                <Loader2 size={14} className="animate-spin" />
                {pendingLabel}
              </div>
            )}
            {error && <p className="text-[var(--text-sm)] text-[var(--danger)]">{error.message}</p>}
          </div>
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
              placeholder={busy ? "Waiting for a response…" : "Ask about your knowledge base…"}
              className="h-11 flex-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3.5 disabled:opacity-60"
            />
            <Button type="submit" disabled={busy || !input.trim()}>
              <Send size={16} />
            </Button>
          </div>
        </form>
      </div>

      <RightPanel sources={sources} activeIndex={activeCitation} orgName={orgName} />
    </div>
  );
}
