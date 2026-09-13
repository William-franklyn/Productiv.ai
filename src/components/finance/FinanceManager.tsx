"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Check, CircleDollarSign, Loader2, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface Connection {
  connected: boolean;
  configured?: boolean;
  nickname?: string;
  balance?: number | null;
  error?: string;
}

interface Receipt {
  id: string;
  direction: "sent" | "received";
  counterparty: string;
  amount: number;
  notes: string | null;
  transaction_id: string;
  occurred_at: string;
}

interface Payment {
  id: string;
  vendor_name: string;
  amount: number;
  description: string | null;
  status: "pending" | "sent" | "discarded";
  created_at: string;
}

export function FinanceManager({ canManage }: { canManage: boolean }) {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [receipts, setReceipts] = useState<Receipt[] | null>(null);
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyPaymentId, setBusyPaymentId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const conn = await fetch("/api/finance/connection").then((r) => r.json());
    setConnection(conn);

    if (conn.connected) {
      fetch("/api/receipts")
        .then((r) => r.json())
        .then((data) => setReceipts(data.receipts ?? []));
    }
    fetch("/api/payments")
      .then((r) => r.json())
      .then((data) => setPayments(data.payments ?? []));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function connect() {
    setConnecting(true);
    setError(null);
    const res = await fetch("/api/finance/connection", { method: "POST" });
    setConnecting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not connect");
      return;
    }
    refresh();
  }

  async function disconnect() {
    await fetch("/api/finance/connection", { method: "DELETE" });
    refresh();
  }

  async function approvePayment(payment: Payment) {
    setBusyPaymentId(payment.id);
    await fetch(`/api/payments/${payment.id}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vendorName: payment.vendor_name,
        amount: payment.amount,
        description: payment.description ?? undefined,
      }),
    });
    setBusyPaymentId(null);
    refresh();
  }

  async function discardPayment(id: string) {
    setBusyPaymentId(id);
    await fetch(`/api/payments/${id}`, { method: "DELETE" });
    setBusyPaymentId(null);
    refresh();
  }

  if (!connection) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 size={20} className="animate-spin text-[var(--muted)]" />
      </div>
    );
  }

  const pendingPayments = (payments ?? []).filter((p) => p.status === "pending");

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold">Finance</h1>
      <p className="mt-1 text-[var(--text-sm)] text-[var(--muted)]">
        A connected Capital One sandbox account the assistant can read and draft payments from.
      </p>

      {!connection.connected ? (
        <Card className="mt-6 flex flex-col items-start gap-3 p-6">
          <p className="text-[var(--text-sm)] text-[var(--muted)]">
            {connection.configured === false
              ? "Finance isn't configured for this deployment yet (missing NESSIE_API_KEY)."
              : "No account connected yet. This creates a demo Capital One checking account for the workspace with a starting balance — sandbox money, not real funds."}
          </p>
          {error && <p className="text-[var(--text-sm)] text-[var(--danger)]">{error}</p>}
          {canManage ? (
            <Button onClick={connect} disabled={connecting || connection.configured === false}>
              {connecting ? <Loader2 size={14} className="animate-spin" /> : <Wallet size={14} />}
              Connect demo account
            </Button>
          ) : (
            <p className="text-[var(--text-xs)] text-[var(--muted)]">Ask a workspace owner or admin to connect one.</p>
          )}
        </Card>
      ) : (
        <>
          <Card className="mt-6 flex items-center justify-between p-6">
            <div>
              <p className="text-[var(--text-sm)] text-[var(--muted)]">{connection.nickname}</p>
              <p className="tabular-nums mt-1 text-2xl font-semibold">
                {connection.balance != null ? `$${connection.balance.toFixed(2)}` : "—"}
              </p>
            </div>
            {canManage && (
              <button onClick={disconnect} className="text-[var(--text-xs)] text-[var(--muted)] hover:text-[var(--danger)]">
                Disconnect
              </button>
            )}
          </Card>

          {pendingPayments.length > 0 && (
            <div className="mt-6">
              <h2 className="text-[var(--text-base)] font-medium">Awaiting approval</h2>
              <div className="mt-3 flex flex-col gap-2">
                {pendingPayments.map((p) => (
                  <Card key={p.id} className="flex items-center gap-3 p-3.5">
                    <CircleDollarSign size={16} className="text-[var(--accent)]" />
                    <div className="flex-1">
                      <p className="text-[var(--text-sm)]">{p.vendor_name}</p>
                      {p.description && <p className="text-[var(--text-xs)] text-[var(--muted)]">{p.description}</p>}
                    </div>
                    <span className="tabular-nums text-[var(--text-sm)] font-medium">${p.amount.toFixed(2)}</span>
                    <Button size="sm" onClick={() => approvePayment(p)} disabled={busyPaymentId === p.id}>
                      <Check size={13} />
                      Approve
                    </Button>
                    <button
                      onClick={() => discardPayment(p.id)}
                      disabled={busyPaymentId === p.id}
                      className="text-[var(--muted)] hover:text-[var(--danger)]"
                    >
                      <Trash2 size={15} />
                    </button>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6">
            <h2 className="text-[var(--text-base)] font-medium">Receipts</h2>
            <p className="mt-1 text-[var(--text-xs)] text-[var(--muted)]">
              A record of every payment sent or received, with the exact time and transaction id.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {!receipts ? (
                <Loader2 size={16} className="animate-spin text-[var(--muted)]" />
              ) : receipts.length === 0 ? (
                <Card className="p-6 text-center text-[var(--text-sm)] text-[var(--muted)]">No receipts yet.</Card>
              ) : (
                receipts.map((r) => (
                  <Card key={r.id} className="flex items-start gap-3 p-3.5">
                    {r.direction === "sent" ? (
                      <ArrowUpFromLine size={16} className="mt-0.5 shrink-0 text-[var(--danger)]" />
                    ) : (
                      <ArrowDownToLine size={16} className="mt-0.5 shrink-0 text-[var(--success)]" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[var(--text-sm)]">
                          {r.direction === "sent" ? "To " : "From "}
                          <span className="font-medium">{r.counterparty}</span>
                        </p>
                        <span
                          className={`tabular-nums shrink-0 text-[var(--text-sm)] font-medium ${
                            r.direction === "sent" ? "text-[var(--danger)]" : "text-[var(--success)]"
                          }`}
                        >
                          {r.direction === "sent" ? "-" : "+"}${r.amount.toFixed(2)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[var(--text-xs)] text-[var(--muted)]">
                        {new Date(r.occurred_at).toLocaleString()}
                        {r.notes ? ` · ${r.notes}` : ""}
                      </p>
                      <p className="mt-0.5 truncate text-[var(--text-xs)] text-[var(--muted)]">
                        Transaction ID: {r.transaction_id}
                      </p>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
