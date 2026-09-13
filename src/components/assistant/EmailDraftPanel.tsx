"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail, Send, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Draft {
  id: string;
  to_email: string;
  subject: string;
  body: string;
  status: "pending" | "sent" | "discarded";
}

export function EmailDraftPanel({
  draftId,
  onClose,
}: {
  draftId: string;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(null);
    setError(null);
    fetch(`/api/email-drafts/${draftId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.draft) return;
        setDraft(data.draft);
        setTo(data.draft.to_email);
        setSubject(data.draft.subject);
        setBody(data.draft.body);
      });
  }, [draftId]);

  async function send() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/email-drafts/${draftId}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, body }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not send email");
      return;
    }
    setDraft((prev) => (prev ? { ...prev, status: "sent" } : prev));
  }

  async function discard() {
    setBusy(true);
    await fetch(`/api/email-drafts/${draftId}`, { method: "DELETE" });
    setBusy(false);
    onClose();
  }

  return (
    <aside className="fixed inset-0 z-40 flex h-full w-full flex-col border-l border-[var(--border)] bg-[var(--surface)] md:static md:z-auto md:w-96 md:shrink-0">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2 text-[var(--text-sm)] font-medium">
          <Mail size={15} className="text-[var(--accent)]" />
          Email draft
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-[var(--muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--ink)]"
        >
          <X size={14} />
        </button>
      </div>

      {!draft ? (
        <div className="flex flex-1 items-center justify-center text-[var(--muted)]">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : draft.status === "sent" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <Send size={20} className="text-[var(--success)]" />
          <p className="text-[var(--text-sm)] text-[var(--muted)]">Sent to {to}</p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          <label className="flex flex-col gap-1 text-[var(--text-xs)] text-[var(--muted)]">
            To
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="name@example.com"
              className="h-9 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-[var(--text-sm)] text-[var(--ink)]"
            />
          </label>
          <label className="flex flex-col gap-1 text-[var(--text-xs)] text-[var(--muted)]">
            Subject
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-9 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-[var(--text-sm)] text-[var(--ink)]"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-[var(--text-xs)] text-[var(--muted)]">
            Body
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[16rem] flex-1 resize-none rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] p-2.5 text-[var(--text-sm)] text-[var(--ink)]"
            />
          </label>

          {error && <p className="text-[var(--text-xs)] text-[var(--danger)]">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button onClick={send} disabled={busy || !to.trim() || !subject.trim() || !body.trim()}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Send
            </Button>
            <button
              onClick={discard}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-[var(--radius)] px-3 py-2 text-[var(--text-sm)] text-[var(--muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--danger)] disabled:opacity-60"
            >
              <Trash2 size={14} />
              Discard
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
