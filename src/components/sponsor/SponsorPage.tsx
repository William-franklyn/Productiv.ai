"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarCheck,
  CheckCircle2,
  CircleHelp,
  ExternalLink,
  HandCoins,
  ListTodo,
  Loader2,
  Mail,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface LedgerEntry {
  action: "answer" | "task" | "meeting" | "email";
  outcome: "completed" | "refused" | "failed";
  credits: number;
  tx_sig: string | null;
  created_at: string;
}

interface SponsorData {
  orgName: string;
  actionsLeft: number;
  breakdown: { answer: number; task: number; meeting: number; email: number };
  refusedCount: number;
  ledger: LedgerEntry[];
}

const ACTION_LABEL: Record<LedgerEntry["action"], string> = {
  answer: "Answered",
  task: "Task created",
  meeting: "Meeting scheduled",
  email: "Email drafted",
};

const ACTION_ICON: Record<LedgerEntry["action"], React.ElementType> = {
  answer: MessageCircle,
  task: ListTodo,
  meeting: CalendarCheck,
  email: Mail,
};

export function SponsorPage({ slug }: { slug: string }) {
  const [data, setData] = useState<SponsorData | null | "not_found">(null);
  const [amount, setAmount] = useState("1");
  const [funding, setFunding] = useState(false);
  const [funded, setFunded] = useState<string | null>(null);
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
    const solAmount = Number(amount);
    if (!solAmount || solAmount <= 0) return;

    setFunding(true);
    setError(null);
    const res = await fetch(`/api/sponsor/${slug}/fund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ solAmount }),
    });
    const body = await res.json().catch(() => ({}));
    setFunding(false);
    if (!res.ok) {
      setError(body.error ?? "Could not process funding");
      return;
    }
    setFunded(body.explorerUrl ?? null);
    setTimeout(() => setFunded(null), 6000);
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

  const totalCompleted = data.breakdown.answer + data.breakdown.task + data.breakdown.meeting + data.breakdown.email;

  return (
    <div className="mx-auto min-h-screen max-w-xl p-6 py-12">
      <p className="text-[var(--text-xs)] uppercase tracking-wide text-[var(--muted)]">Sponsored workspace</p>
      <h1 className="mt-1 text-[var(--text-xl)] font-semibold">{data.orgName}</h1>
      <p className="mt-1 text-[var(--text-sm)] text-[var(--muted)]">
        Every action this workspace's AI takes is funded by a sponsor and accounted for publicly
        below — without ever revealing what anyone asked. Funds platform usage only; sponsor credit
        can&apos;t be withdrawn or transferred.
      </p>

      <Card className="mt-6 p-5">
        <p className="text-[var(--text-sm)] text-[var(--muted)]">Work funded</p>
        <p className="tabular-nums mt-1 text-[var(--text-lg)] font-semibold">{totalCompleted.toLocaleString()} actions</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[var(--text-sm)] sm:grid-cols-4">
          <div className="flex items-center gap-1.5">
            <MessageCircle size={14} className="text-[var(--accent)]" />
            {data.breakdown.answer.toLocaleString()} answered
          </div>
          <div className="flex items-center gap-1.5">
            <ListTodo size={14} className="text-[var(--accent)]" />
            {data.breakdown.task.toLocaleString()} tasks
          </div>
          <div className="flex items-center gap-1.5">
            <CalendarCheck size={14} className="text-[var(--accent)]" />
            {data.breakdown.meeting.toLocaleString()} meetings
          </div>
          <div className="flex items-center gap-1.5">
            <Mail size={14} className="text-[var(--accent)]" />
            {data.breakdown.email.toLocaleString()} emails
          </div>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Card className="p-4 text-center">
          <p className="tabular-nums text-[var(--text-lg)] font-semibold">{data.refusedCount.toLocaleString()}</p>
          <p className="mt-1 text-[var(--text-xs)] text-[var(--muted)]">Questions unanswered</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="tabular-nums text-[var(--text-lg)] font-semibold">{data.actionsLeft.toLocaleString()}</p>
          <p className="mt-1 text-[var(--text-xs)] text-[var(--muted)]">Actions left</p>
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
          <div className="mt-3 flex flex-col gap-1">
            <p className="flex items-center gap-2 text-[var(--text-sm)] text-[var(--success)]">
              <CheckCircle2 size={15} />
              Funded — the workspace's balance just updated.
            </p>
            <a
              href={funded}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[var(--text-xs)] text-[var(--accent)] hover:underline"
            >
              Verify the transfer <ExternalLink size={11} />
            </a>
          </div>
        ) : (
          <form onSubmit={fund} className="mt-3 flex items-center gap-2">
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-10 w-28 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-3"
            />
            <span className="text-[var(--text-sm)] text-[var(--muted)]">devnet SOL</span>
            <Button type="submit" disabled={funding}>
              {funding ? <Loader2 size={14} className="animate-spin" /> : <HandCoins size={14} />}
              Fund
            </Button>
          </form>
        )}
        {error && <p className="mt-2 text-[var(--text-xs)] text-[var(--danger)]">{error}</p>}
        <p className="mt-2 text-[var(--text-xs)] text-[var(--muted)]">
          A real Solana devnet transfer — no real money moves.
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
            data.ledger.map((entry, i) => {
              const Icon = entry.outcome === "completed" ? ACTION_ICON[entry.action] : CircleHelp;
              return (
                <div
                  key={i}
                  className="flex items-center justify-between border-b border-[var(--border)] py-2 text-[var(--text-sm)] last:border-0"
                >
                  <span className="flex items-center gap-2">
                    <Icon size={14} className={entry.outcome === "completed" ? "text-[var(--accent)]" : "text-[var(--muted)]"} />
                    {entry.outcome === "completed" ? ACTION_LABEL[entry.action] : "Unanswered"}
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
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
