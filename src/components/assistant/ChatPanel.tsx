"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import {
  ExternalLink,
  Loader2,
  Mic,
  Paperclip,
  Send,
  Square,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import clsx from "clsx";
import { Button } from "@/components/ui/Button";
import { ChatMessage } from "./ChatMessage";
import { EmptyState } from "./EmptyState";
import { EmailDraftPanel } from "./EmailDraftPanel";
import { PaymentApprovalPanel } from "./PaymentApprovalPanel";
import { getEmailDraft, getDraftedPayment, getText } from "@/lib/ai/message-parts";

type SidePanel = { type: "email"; id: string } | { type: "payment"; id: string } | null;

const VOICE_REPLIES_KEY = "irabu-voice-replies";

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

  const [sidePanel, setSidePanel] = useState<SidePanel>(null);
  const seenDraftId = useRef<string | null>(null);
  const seenPaymentId = useRef<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [voiceReplies, setVoiceReplies] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const spokenIdsRef = useRef<Set<string>>(new Set(initialMessages.map((m) => m.id)));
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setVoiceReplies(localStorage.getItem(VOICE_REPLIES_KEY) === "1");
  }, []);

  function toggleVoiceReplies() {
    setVoiceReplies((prev) => {
      const next = !prev;
      localStorage.setItem(VOICE_REPLIES_KEY, next ? "1" : "0");
      if (!next) audioRef.current?.pause();
      return next;
    });
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // The conversation's title auto-updates server-side from its first
  // message, but the sidebar only refetches on route changes — tell it to
  // refresh whenever a reply finishes, so a freshly-titled active
  // conversation doesn't keep showing "New conversation" until you navigate
  // away and back.
  const wasBusyRef = useRef(false);
  useEffect(() => {
    if (wasBusyRef.current && !busy) {
      window.dispatchEvent(new Event("irabu:conversation-updated"));
    }
    wasBusyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    let latestDraft: string | null = null;
    let latestPayment: string | null = null;
    for (const m of messages) {
      const draft = getEmailDraft(m);
      if (draft) latestDraft = draft.draftId;
      const payment = getDraftedPayment(m);
      if (payment) latestPayment = payment.paymentId;
    }
    if (latestPayment && latestPayment !== seenPaymentId.current) {
      seenPaymentId.current = latestPayment;
      setSidePanel({ type: "payment", id: latestPayment });
    } else if (latestDraft && latestDraft !== seenDraftId.current) {
      seenDraftId.current = latestDraft;
      setSidePanel({ type: "email", id: latestDraft });
    }
  }, [messages]);

  // Speak newly-completed assistant replies aloud when voice mode is on —
  // gated on status settling back to "ready" so it fires once per finished
  // message rather than mid-stream, and skips anything reloaded from history.
  useEffect(() => {
    if (!voiceReplies || busy) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant" || spokenIdsRef.current.has(last.id)) return;

    const text = getText(last);
    if (!text.trim()) return;
    spokenIdsRef.current.add(last.id);

    fetch("/api/voice/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
      .then(async (res) => {
        if (res.ok) return res.blob();
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not speak the reply");
      })
      .then((blob) => {
        audioRef.current?.pause();
        const audio = new Audio(URL.createObjectURL(blob));
        audioRef.current = audio;
        audio.play().catch(() => {});
      })
      .catch((err) => setVoiceError(err instanceof Error ? err.message : "Could not speak the reply"));
  }, [messages, busy, voiceReplies]);

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

  async function startRecording() {
    setVoiceError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setIsTranscribing(true);
        const formData = new FormData();
        formData.append("audio", blob, "recording.webm");
        try {
          const res = await fetch("/api/voice/transcribe", { method: "POST", body: formData });
          const body = await res.json();
          if (!res.ok) throw new Error(body.error ?? "Could not transcribe audio");
          // Land the transcript in the composer for review — never auto-send,
          // so a misheard word is easy to fix before it goes anywhere.
          setInput((prev) => (prev ? `${prev} ${body.text}` : body.text));
        } catch (err) {
          setVoiceError(err instanceof Error ? err.message : "Could not transcribe audio");
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      setVoiceError("Microphone access was denied or unavailable.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  return (
    <div className="flex h-screen">
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-end gap-1 border-b border-[var(--border)] px-4 py-2">
          <button
            onClick={toggleVoiceReplies}
            title={voiceReplies ? "Voice replies on — click to mute" : "Voice replies off — click to enable"}
            className="flex items-center gap-1.5 rounded-[var(--radius)] px-2 py-1 text-[var(--text-xs)] text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--ink)]"
          >
            {voiceReplies ? <Volume2 size={13} /> : <VolumeX size={13} />}
            Voice replies
          </button>
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
                <ChatMessage
                  key={m.id}
                  message={m}
                  onOpenDraft={(id) => setSidePanel({ type: "email", id })}
                  onOpenPayment={(id) => setSidePanel({ type: "payment", id })}
                />
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
            {voiceError && <p className="text-[var(--text-xs)] text-[var(--danger)]">{voiceError}</p>}

            <div
              className={clsx(
                "flex items-end gap-1 rounded-[var(--radius-lg)] border bg-[var(--surface)] p-1.5 transition-colors",
                isRecording ? "border-[var(--danger)]" : "border-[var(--border)] focus-within:border-[var(--accent)]",
              )}
            >
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
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--ink)] disabled:opacity-50"
              >
                <Paperclip size={16} />
              </button>

              <button
                type="button"
                disabled={busy || uploadingFile || isTranscribing}
                onClick={isRecording ? stopRecording : startRecording}
                aria-label={isRecording ? "Stop recording" : "Record a voice message"}
                title={isRecording ? "Stop recording" : "Talk instead of typing"}
                className={clsx(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full disabled:opacity-50",
                  isRecording
                    ? "animate-pulse bg-[var(--danger)] text-white"
                    : "text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--ink)]",
                )}
              >
                {isTranscribing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : isRecording ? (
                  <Square size={14} />
                ) : (
                  <Mic size={16} />
                )}
              </button>

              <textarea
                rows={1}
                value={input}
                disabled={busy || uploadingFile}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit(input);
                  }
                }}
                placeholder={
                  isRecording
                    ? "Listening…"
                    : isTranscribing
                      ? "Transcribing…"
                      : uploadingFile
                        ? "Uploading document…"
                        : busy
                          ? "Waiting for a response…"
                          : "Ask about your knowledge base, or ask for a chart…"
                }
                className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2 text-[var(--text-base)] leading-relaxed outline-none disabled:opacity-60"
              />

              <Button
                type="submit"
                className="rounded-full!"
                disabled={busy || uploadingFile || (!input.trim() && !pendingFile)}
              >
                {uploadingFile ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {sidePanel?.type === "email" && (
        <EmailDraftPanel draftId={sidePanel.id} onClose={() => setSidePanel(null)} />
      )}
      {sidePanel?.type === "payment" && (
        <PaymentApprovalPanel paymentId={sidePanel.id} onClose={() => setSidePanel(null)} />
      )}
    </div>
  );
}
