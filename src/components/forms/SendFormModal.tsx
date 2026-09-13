"use client";

import { useState } from "react";
import { Loader2, Send, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function SendFormModal({
  formId,
  onClose,
}: {
  formId: string;
  onClose: () => void;
}) {
  const [emails, setEmails] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const list = emails
      .split(/[,\n]/)
      .map((e) => e.trim())
      .filter(Boolean);
    if (list.length === 0) return;

    setBusy(true);
    setError(null);
    const res = await fetch(`/api/forms/${formId}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emails: list, message: message || undefined }),
    });
    setBusy(false);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "Could not send");
      return;
    }
    setResult(`Sent to ${body.sentCount} of ${body.total} recipient(s).`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--scrim)] p-4">
      <div className="w-full max-w-sm rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[var(--text-base)] font-semibold">Send form</h2>
          <button onClick={onClose} aria-label="Close" className="text-[var(--muted)] hover:text-[var(--ink)]">
            <X size={16} />
          </button>
        </div>

        {result ? (
          <p className="mt-4 text-[var(--text-sm)] text-[var(--success)]">{result}</p>
        ) : (
          <>
            <textarea
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="Recipient emails, comma or newline separated"
              rows={3}
              className="mt-4 w-full resize-none rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] p-2.5 text-[var(--text-sm)]"
            />
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Personal message (optional)"
              className="mt-2 h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-3 text-[var(--text-sm)]"
            />
            {error && <p className="mt-2 text-[var(--text-xs)] text-[var(--danger)]">{error}</p>}
            <div className="mt-4 flex justify-end">
              <Button size="sm" onClick={send} disabled={busy || !emails.trim()}>
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Send
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
