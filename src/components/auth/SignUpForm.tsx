"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite") ?? undefined;

  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      // Stashed as auth user_metadata so the deferred bootstrap path
      // (src/lib/auth/guard.ts's ensureBootstrapped) can still create the
      // workspace later if email confirmation means no session — and thus
      // no immediate call to /api/auth/bootstrap below — happens right now.
      options: { data: { fullName, orgName, inviteToken } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setPending(false);
      return;
    }

    if (!data.session) {
      // Email confirmation is required by this Supabase project's settings —
      // the workspace gets created automatically the first time this user
      // is resolved after confirming and signing in.
      setNeedsConfirmation(true);
      setPending(false);
      return;
    }

    const res = await fetch("/api/auth/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, orgName, inviteToken }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong setting up your account");
      setPending(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  if (needsConfirmation) {
    return (
      <p className="text-[var(--text-sm)] text-[var(--muted)]">
        Check your email to confirm your account, then sign in.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-[var(--text-sm)]">
        Your name
        <input
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="h-10 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3"
        />
      </label>
      {!inviteToken && (
        <label className="flex flex-col gap-1.5 text-[var(--text-sm)]">
          Workspace name
          <input
            placeholder="Acme Inc."
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            className="h-10 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3"
          />
        </label>
      )}
      <label className="flex flex-col gap-1.5 text-[var(--text-sm)]">
        Email
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-10 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-[var(--text-sm)]">
        Password
        <input
          required
          minLength={8}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-10 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3"
        />
      </label>
      {error && <p className="text-[var(--text-sm)] text-[var(--danger)]">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
