"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, CircleHelp, ExternalLink, HandCoins, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface LedgerEntry {
  kind: "answered" | "refused";
  cost_lamports: number;
  tx_sig: string | null;
  created_at: string;
}

interface SponsorData {
  orgName: string;
  answersLeft: number;
  answeredCount: number;
  refusedCount: number;
  ledger: LedgerEntry[];
}

export function SponsorPage({ slug }: { slug: string }) {
  const [data, setData] = useState<SponsorData | null | "not_found">(null);
  const [amount, setAmount] = useState("5");
  const [funding, setFunding] = useState(false);
  const [funded, setFunded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    fetch(`/api/sponsor/${slug}`)
      .then((res) => (res.ok ? res.json() : "not_found"))
      .then(setData)
      .catch(() => setData("not_found"));
  }, [slug]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  async function fund(e: React.FormEvent) {
    e.preventDefault();
    const amountUsd = Number(amount);
    if (!amountUsd || amountUsd <= 0) return;

    setFunding(true);
    setError(null);
    const res = await fetch(`/api/sponsor/${slug}/fund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountUsd }),
    });
    setFunding(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not process funding");
      return;
    }
    setFunded(true);
    setTimeout(() => setFunded(false), 3000);
    refresh();
  }

  if (data === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 size={20} className="animate-spin text-[var(--muted)]" />
      </div>
    );
  }

  if (data === "not_found") {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center text-[var(--muted)]">
        This funding link isn&apos;t active.
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-xl p-6 py-12">
      <p className="text-[var(--text-xs)] uppercase tracking-wide text-[var(--muted)]">Sponsored workspace</p>
      <h1 className="mt-1 text-2xl font-semibold">{data.orgName}</h1>
      <p className="mt-1 text-[var(--text-sm)] text-[var(--muted)]">
        Every question this workspace's AI answers is funded by a sponsor and accounted for publicly
        below — without ever revealing what anyone asked.
      </p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <p className="tabular-nums text-xl font-semibold">{data.answeredCount.toLocaleString()}</p>
          <p className="mt-1 text-[var(--text-xs)] text-[var(--muted)]">Answers funded</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="tabular-nums text-xl font-semibold">{data.refusedCount.toLocaleString()}</p>
          <p className="mt-1 text-[var(--text-xs)] text-[var(--muted)]">Questions unanswered</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="tabular-nums text-xl font-semibold">{data.answersLeft.toLocaleString()}</p>
          <p className="mt-1 text-[var(--text-xs)] text-[var(--muted)]">Answers left</p>
        </Card>
      </div>

      {data.refusedCount > 0 && (
        <p className="mt-3 text-[var(--text-xs)] text-[var(--muted)]">
          Unanswered questions are a funding signal, not a failure — they mean this workspace needs
          more material, not just more credit.
        </p>
      )}

      <Card className="mt-6 p-5">
        <h2 className="flex items-center gap-2 text-[var(--text-base)] font-medium">
          <HandCoins size={16} className="text-[var(--accent)]" />
          Fund this workspace
        </h2>
        {funded ? (
          <p className="mt-3 flex items-center gap-2 text-[var(--text-sm)] text-[var(--success)]">
            <CheckCircle2 size={15} />
            Thanks — the workspace's balance just updated.
          </p>
        ) : (
          <form onSubmit={fund} className="mt-3 flex items-center gap-2">
            <span className="text-[var(--text-base)] text-[var(--muted)]">$</span>
            <input
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-10 w-28 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-3"
            />
            <Button type="submit" disabled={funding}>
              {funding ? <Loader2 size={14} className="animate-spin" /> : <HandCoins size={14} />}
              Fund
            </Button>
          </form>
        )}
        {error && <p className="mt-2 text-[var(--text-xs)] text-[var(--danger)]">{error}</p>}
        <p className="mt-2 text-[var(--text-xs)] text-[var(--muted)]">
          Sandbox funds via Capital One's Nessie API — no real money moves.
        </p>
      </Card>

      <div className="mt-6">
        <h2 className="text-[var(--text-base)] font-medium">Live ledger</h2>
        <p className="mt-1 text-[var(--text-xs)] text-[var(--muted)]">
          Anchored on Solana devnet — verifiable by anyone, revealing nothing about who asked what.
        </p>
        <div className="mt-3 flex flex-col gap-1">
          {data.ledger.length === 0 ? (
            <Card className="p-6 text-center text-[var(--text-sm)] text-[var(--muted)]">
              No activity yet.
            </Card>
          ) : (
            data.ledger.map((entry, i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b border-[var(--border)] py-2 text-[var(--text-sm)] last:border-0"
              >
                <span className="flex items-center gap-2">
                  {entry.kind === "answered" ? (
                    <MessageCircle size={14} className="text-[var(--accent)]" />
                  ) : (
                    <CircleHelp size={14} className="text-[var(--muted)]" />
                  )}
                  {entry.kind === "answered" ? "Answered" : "Unanswered"}
                  <span className="text-[var(--text-xs)] text-[var(--muted)]">
                    {new Date(entry.created_at).toLocaleString()}
                  </span>
                </span>
                {entry.tx_sig ? (
                  <a
                    href={`https://explorer.solana.com/tx/${entry.tx_sig}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[var(--text-xs)] text-[var(--accent)] hover:underline"
                  >
                    Verify <ExternalLink size={11} />
                  </a>
                ) : (
                  <span className="text-[var(--text-xs)] text-[var(--muted)]">Settling…</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
