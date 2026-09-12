"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { ExternalLink, Loader2, Paperclip, Send, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ChatMessage } from "./ChatMessage";
import { EmptyState } from "./EmptyState";
import { EmailDraftPanel } from "./EmailDraftPanel";
import { getEmailDraft } from "@/lib/ai/message-parts";

export function ChatPanel({
  conversationId,
  initialMessages,
}: {
  conversationId: string;
  initialMessages: UIMessage[];
}) {
  const searchParams = useSearchParams();
  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: "/api/assistant/chat",
        body: { conversationId },
      }),
  );
  const { messages, sendMessage, status, error } = useChat({ transport, messages: initialMessages });
  const [input, setInput] = useState(() => searchParams.get("q") ?? "");
  const bottomRef = useRef<HTMLDivElement>(null);
  const busy = status === "streaming" || status === "submitted";

  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const seenDraftId = useRef<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    let latest: string | null = null;
    for (const m of messages) {
      const draft = getEmailDraft(m);
      if (draft) latest = draft.draftId;
    }
    if (latest && latest !== seenDraftId.current) {
      seenDraftId.current = latest;
      setActiveDraftId(latest);
    }
  }, [messages]);

  async function submit(text: string) {
    if (!text.trim() && !pendingFile) return;

    let messageText = text.trim();

    if (pendingFile) {
      setUploadingFile(true);
      const formData = new FormData();
      formData.append("file", pendingFile);
      const res = await fetch("/api/knowledge/sources", { method: "POST", body: formData });
      setUploadingFile(false);

      const uploadNote = res.ok
        ? `I uploaded a document named "${pendingFile.name}" to the knowledge base.`
        : `I tried to upload "${pendingFile.name}" but it failed.`;
      messageText = messageText ? `${uploadNote} ${messageText}` : uploadNote;
      setPendingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }

    if (!messageText.trim()) return;
    sendMessage({ role: "user", parts: [{ type: "text", text: messageText }] });
    setInput("");
  }

  return (
    <div className="flex h-screen">
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-end border-b border-[var(--border)] px-4 py-2">
          <button
            onClick={() => window.open(`/assistant/${conversationId}`, "_blank", "noopener,noreferrer")}
            className="flex items-center gap-1.5 rounded-[var(--radius)] px-2 py-1 text-[var(--text-xs)] text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--ink)]"
          >
            <ExternalLink size={13} />
            Open in new tab
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <EmptyState onPick={submit} />
          ) : (
            <div className="mx-auto flex max-w-2xl flex-col gap-6">
              {messages.map((m) => (
                <ChatMessage key={m.id} message={m} onOpenDraft={setActiveDraftId} />
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
          <div className="mx-auto flex max-w-2xl flex-col gap-2">
            {pendingFile && (
              <div className="flex w-fit items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--accent-soft)] px-2.5 py-1 text-[var(--text-xs)]">
                <Paperclip size={12} />
                {pendingFile.name}
                <button
                  type="button"
                  onClick={() => {
                    setPendingFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  aria-label="Remove attachment"
                  className="text-[var(--muted)] hover:text-[var(--danger)]"
                >
                  <X size={12} />
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.csv,.json,.pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setPendingFile(file);
                }}
              />
              <button
                type="button"
                disabled={busy || uploadingFile}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Attach a document"
                title="Upload a document to the knowledge base"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius)] border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--ink)] disabled:opacity-60"
              >
                <Paperclip size={16} />
              </button>
              <input
                value={input}
                disabled={busy || uploadingFile}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  uploadingFile
                    ? "Uploading document…"
                    : busy
                      ? "Waiting for a response…"
                      : "Ask about your knowledge base, or ask for a chart…"
                }
                className="h-11 flex-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3.5 disabled:opacity-60"
              />
              <Button type="submit" disabled={busy || uploadingFile || (!input.trim() && !pendingFile)}>
                {uploadingFile ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {activeDraftId && (
        <EmailDraftPanel draftId={activeDraftId} onClose={() => setActiveDraftId(null)} />
      )}
    </div>
  );
}
