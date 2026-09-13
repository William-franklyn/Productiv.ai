"use client";

import { useEffect, useState } from "react";
import { Check, Copy, HandCoins, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface Funding {
  creditBalance: number;
  answersLeft: number;
  sponsorSlug: string | null;
  sponsorUrl: string | null;
}

export function SponsorshipCard({ canManage }: { canManage: boolean }) {
  const [funding, setFunding] = useState<Funding | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/workspace/funding")
      .then((res) => res.json())
      .then(setFunding);
  }, []);

  async function getFundingLink() {
    setCreating(true);
    const res = await fetch("/api/workspace/funding", { method: "POST" });
    const body = await res.json();
    setCreating(false);
    if (res.ok) setFunding((prev) => (prev ? { ...prev, sponsorUrl: body.sponsorUrl } : prev));
  }

  function copyLink() {
    if (!funding?.sponsorUrl) return;
    navigator.clipboard.writeText(funding.sponsorUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Card className="p-5">
      <h3 className="flex items-center gap-2 text-[var(--text-base)] font-medium">
        <HandCoins size={16} className="text-[var(--accent)]" />
        Sponsorship
      </h3>
      <p className="mt-1 text-[var(--text-sm)] text-[var(--muted)]">
        A sponsor funds the workspace's assistant usage and can see a public, verifiable ledger of
        what it bought — without ever seeing what anyone asked.
      </p>

      {!funding ? (
        <Loader2 size={16} className="mt-4 animate-spin text-[var(--muted)]" />
      ) : (
        <div className="mt-4 flex items-center justify-between rounded-[var(--radius)] border border-[var(--border)] px-4 py-3">
          <span className="text-[var(--text-sm)] text-[var(--muted)]">Balance</span>
          <span className="tabular-nums text-[var(--text-base)] font-medium">
            ≈ {funding.answersLeft.toLocaleString()} answers left
          </span>
        </div>
      )}

      <div className="mt-4">
        {funding?.sponsorUrl ? (
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={funding.sponsorUrl}
              className="h-9 flex-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-3 text-[var(--text-sm)] text-[var(--muted)]"
            />
            <Button size="sm" variant="secondary" onClick={copyLink}>
              {copied ? <Check size={13} /> : <Copy size={13} />}
              Copy
            </Button>
          </div>
        ) : canManage ? (
          <Button size="sm" onClick={getFundingLink} disabled={creating || !funding}>
            {creating ? <Loader2 size={14} className="animate-spin" /> : <HandCoins size={14} />}
            Get a funding link
          </Button>
        ) : (
          <p className="text-[var(--text-xs)] text-[var(--muted)]">
            Ask a workspace owner or admin to create a funding link.
          </p>
        )}
      </div>
    </Card>
  );
}
