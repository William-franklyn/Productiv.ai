"use client";

import { useEffect, useState } from "react";
import { CircleDollarSign, Loader2, Send, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Payment {
  id: string;
  vendor_name: string;
  amount: number;
  description: string | null;
  status: "pending" | "sent" | "discarded";
}

export function PaymentApprovalPanel({
  paymentId,
  onClose,
}: {
  paymentId: string;
  onClose: () => void;
}) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [vendorName, setVendorName] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPayment(null);
    setError(null);
    fetch(`/api/payments/${paymentId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.payment) return;
        setPayment(data.payment);
        setVendorName(data.payment.vendor_name);
        setAmount(String(data.payment.amount));
        setDescription(data.payment.description ?? "");
      });
  }, [paymentId]);

  async function send() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/payments/${paymentId}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendorName, amount: Number(amount), description: description || undefined }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not send payment");
      return;
    }
    setPayment((prev) => (prev ? { ...prev, status: "sent" } : prev));
  }

  async function discard() {
    setBusy(true);
    await fetch(`/api/payments/${paymentId}`, { method: "DELETE" });
    setBusy(false);
    onClose();
  }

  const amountValid = Number(amount) > 0;

  return (
    <aside className="flex h-screen w-96 shrink-0 flex-col border-l border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2 text-[var(--text-sm)] font-medium">
          <CircleDollarSign size={15} className="text-[var(--accent)]" />
          Payment
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--ink)]"
        >
          <X size={14} />
        </button>
      </div>

      {!payment ? (
        <div className="flex flex-1 items-center justify-center text-[var(--muted)]">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : payment.status === "sent" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <Send size={20} className="text-[var(--success)]" />
          <p className="text-[var(--text-sm)] text-[var(--muted)]">
            Paid {vendorName} ${Number(amount).toFixed(2)}
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          <p className="text-[var(--text-xs)] text-[var(--muted)]">
            This creates a real transaction on the connected sandbox account — review before sending.
          </p>
          <label className="flex flex-col gap-1 text-[var(--text-xs)] text-[var(--muted)]">
            Vendor
            <input
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              className="h-9 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-[var(--text-sm)] text-[var(--ink)]"
            />
          </label>
          <label className="flex flex-col gap-1 text-[var(--text-xs)] text-[var(--muted)]">
            Amount (USD)
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-9 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-[var(--text-sm)] text-[var(--ink)]"
            />
          </label>
          <label className="flex flex-col gap-1 text-[var(--text-xs)] text-[var(--muted)]">
            Memo (optional)
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-9 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-[var(--text-sm)] text-[var(--ink)]"
            />
          </label>

          {error && <p className="text-[var(--text-xs)] text-[var(--danger)]">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button onClick={send} disabled={busy || !vendorName.trim() || !amountValid}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Send payment
            </Button>
            <button
              onClick={discard}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-[var(--radius)] px-3 py-2 text-[var(--text-sm)] text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--danger)] disabled:opacity-60"
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
