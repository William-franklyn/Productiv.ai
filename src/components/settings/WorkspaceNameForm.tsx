"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function WorkspaceNameForm({
  initialName,
  canEdit,
}: {
  initialName: string;
  canEdit: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setSaved(false);

    const res = await fetch("/api/settings/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    setPending(false);
    if (res.ok) setSaved(true);
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2">
      <input
        value={name}
        disabled={!canEdit}
        onChange={(e) => setName(e.target.value)}
        className="h-10 max-w-xs flex-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 disabled:opacity-60"
      />
      {canEdit && (
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          {saved ? "Saved" : "Save"}
        </Button>
      )}
    </form>
  );
}
