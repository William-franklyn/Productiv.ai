"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Mail, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface Member {
  id: string;
  full_name: string | null;
  role: "owner" | "admin" | "member";
}

interface Invite {
  id: string;
  email: string;
  role: string;
  token: string;
  created_at: string;
}

export function TeamManager() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/team");
    if (res.ok) {
      const body = await res.json();
      setMembers(body.members);
      setInvites(body.invites);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setEmailStatus(null);

    const res = await fetch("/api/team/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role: "member", message: message.trim() || undefined }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not send invite");
    } else {
      const body = await res.json();
      setEmailStatus(body.emailSent ? `Emailed ${email}` : "Invite created — copy the link below to share it");
      setEmail("");
      setMessage("");
      refresh();
    }
    setPending(false);
  }

  function copyLink(invite: Invite) {
    const url = `${window.location.origin}/invite/${invite.token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(invite.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <div>
      <h1 className="text-xl font-semibold">Team</h1>
      <p className="mt-1 text-[var(--text-sm)] text-[var(--muted)]">
        Invite teammates into this workspace.
      </p>

      <form onSubmit={onInvite} className="mt-6 flex flex-col gap-2 max-w-sm">
        <input
          required
          type="email"
          placeholder="teammate@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-10 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3"
        />
        <input
          placeholder="Add a personal note (optional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="h-10 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--text-sm)]"
        />
        <Button type="submit" disabled={pending} className="w-fit">
          <UserPlus size={16} />
          Invite
        </Button>
      </form>
      {error && <p className="mt-2 text-[var(--text-sm)] text-[var(--danger)]">{error}</p>}
      {emailStatus && (
        <p className="mt-2 flex items-center gap-1.5 text-[var(--text-sm)] text-[var(--success)]">
          <Mail size={13} />
          {emailStatus}
        </p>
      )}

      <h2 className="mt-8 text-[var(--text-sm)] font-medium text-[var(--muted)]">
        Members
      </h2>
      <div className="mt-2 flex flex-col gap-2">
        {members.map((m) => (
          <Card key={m.id} className="flex items-center justify-between p-3.5">
            <span className="text-[var(--text-sm)]">{m.full_name ?? "Unnamed"}</span>
            <span className="text-[var(--text-xs)] capitalize text-[var(--muted)]">
              {m.role}
            </span>
          </Card>
        ))}
      </div>

      {invites.length > 0 && (
        <>
          <h2 className="mt-8 text-[var(--text-sm)] font-medium text-[var(--muted)]">
            Pending invites
          </h2>
          <div className="mt-2 flex flex-col gap-2">
            {invites.map((invite) => (
              <Card key={invite.id} className="flex items-center justify-between p-3.5">
                <span className="text-[var(--text-sm)]">{invite.email}</span>
                <button
                  onClick={() => copyLink(invite)}
                  className="flex items-center gap-1.5 text-[var(--text-xs)] text-[var(--accent)]"
                >
                  {copiedId === invite.id ? <Check size={13} /> : <Copy size={13} />}
                  {copiedId === invite.id ? "Copied" : "Copy invite link"}
                </button>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
