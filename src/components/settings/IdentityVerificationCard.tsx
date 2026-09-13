"use client";

import Script from "next/script";
import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

declare global {
  interface Window {
    Persona?: {
      Client: new (opts: {
        templateId: string;
        environmentId: string;
        referenceId?: string;
        onReady: () => void;
        onComplete: (result: { inquiryId: string; status: string }) => void;
        onCancel?: () => void;
        onError?: (error: unknown) => void;
      }) => { open: () => void };
    };
  }
}

interface Status {
  verifiedAt: string | null;
  approved: boolean;
}

// Identity verification (Persona) — proves the person at the keyboard is a
// real, specific human. It does not by itself grant access to anything; an
// org owner/admin still has to approve this person for sensitive sources in
// Team. See docs/verified-access.md.
export function IdentityVerificationCard({ userId }: { userId: string }) {
  const [scriptReady, setScriptReady] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const templateId = process.env.NEXT_PUBLIC_PERSONA_TEMPLATE_ID;
  const environmentId = process.env.NEXT_PUBLIC_PERSONA_ENVIRONMENT_ID;

  const refresh = useCallback(() => {
    fetch("/api/identity/verify")
      .then((res) => res.json())
      .then(setStatus);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function startVerification() {
    if (!window.Persona || !templateId || !environmentId) return;
    setError(null);
    setVerifying(true);

    const client = new window.Persona.Client({
      templateId,
      environmentId,
      referenceId: userId,
      onReady: () => client.open(),
      onComplete: async ({ inquiryId }) => {
        const res = await fetch("/api/identity/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inquiryId }),
        });
        setVerifying(false);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error ?? "Verification could not be confirmed");
          return;
        }
        refresh();
      },
      onCancel: () => setVerifying(false),
      onError: () => {
        setVerifying(false);
        setError("Persona widget failed to load");
      },
    });
  }

  const configured = Boolean(templateId && environmentId);

  return (
    <Card className="p-5">
      <Script
        src="https://cdn.withpersona.com/dist/persona-v5.4.0.js"
        crossOrigin="anonymous"
        onReady={() => setScriptReady(true)}
      />
      <h3 className="flex items-center gap-2 text-[var(--text-base)] font-medium">
        <ShieldCheck size={16} className="text-[var(--accent)]" />
        Identity verification
      </h3>
      <p className="mt-1 text-[var(--text-sm)] text-[var(--muted)]">
        Verifying proves you're a real, specific human — it doesn't by itself grant access to
        anything. An owner or admin still has to approve you for this workspace's most sensitive
        sources in Team.
      </p>

      {!configured ? (
        <p className="mt-4 text-[var(--text-xs)] text-[var(--muted)]">
          Identity verification isn't configured for this deployment.
        </p>
      ) : status === null ? (
        <Loader2 size={16} className="mt-4 animate-spin text-[var(--muted)]" />
      ) : status.verifiedAt ? (
        <div className="mt-4 flex flex-col gap-1">
          <p className="flex items-center gap-1.5 text-[var(--text-sm)] text-[var(--success)]">
            <ShieldCheck size={14} />
            Verified {new Date(status.verifiedAt).toLocaleDateString()}
          </p>
          <p className="text-[var(--text-xs)] text-[var(--muted)]">
            {status.approved
              ? "Approved for sensitive-source access."
              : "Not yet approved for sensitive sources — ask an owner or admin."}
          </p>
        </div>
      ) : (
        <Button className="mt-4" onClick={startVerification} disabled={!scriptReady || verifying}>
          {verifying ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
          Verify my identity
        </Button>
      )}
      {error && <p className="mt-2 text-[var(--text-xs)] text-[var(--danger)]">{error}</p>}
    </Card>
  );
}
