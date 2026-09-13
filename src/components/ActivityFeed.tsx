"use client";

import { useEffect, useState } from "react";
import { FileText, Pencil, Plus, UserPlus } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface ActivityEntry {
  id: string;
  action: string;
  detail: string;
  created_at: string;
  actor: { full_name: string | null } | { full_name: string | null }[] | null;
}

const actionIcons: Record<string, typeof FileText> = {
  uploaded_document: FileText,
  created_task: Plus,
  invited_teammate: UserPlus,
  renamed_workspace: Pencil,
};

function actorName(actor: ActivityEntry["actor"]) {
  const a = Array.isArray(actor) ? actor[0] : actor;
  return a?.full_name ?? "Someone";
}

export function ActivityFeed() {
  const [entries, setEntries] = useState<ActivityEntry[] | null>(null);

  useEffect(() => {
    fetch("/api/activity")
      .then((r) => r.json())
      .then((body) => setEntries(body.entries));
  }, []);

  return (
    <div className="flex flex-col gap-2">
      {entries === null && <p className="text-[var(--text-sm)] text-[var(--muted)]">Loading…</p>}
      {entries?.length === 0 && (
        <Card className="p-4 sm:p-6 lg:p-8 text-center text-[var(--text-sm)] text-[var(--muted)]">
          Nothing has happened here yet.
        </Card>
      )}
      {entries?.map((entry) => {
        const Icon = actionIcons[entry.action] ?? FileText;
        return (
          <Card key={entry.id} className="flex items-center gap-3 p-3.5">
            <Icon size={16} className="shrink-0 text-[var(--accent)]" />
            <div className="flex-1">
              <p className="text-[var(--text-sm)]">{entry.detail}</p>
              <p className="text-[var(--text-xs)] text-[var(--muted)]">
                {actorName(entry.actor)} · {new Date(entry.created_at).toLocaleString()}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
