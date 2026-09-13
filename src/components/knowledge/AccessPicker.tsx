"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldOff, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Member {
  id: string;
  full_name: string | null;
}

export function AccessPicker({
  title,
  initialRestrictedIds,
  excludeUserId,
  onConfirm,
  onCancel,
  confirmLabel = "Save",
  extraToggle,
}: {
  title: string;
  initialRestrictedIds: string[];
  excludeUserId?: string;
  onConfirm: (restrictedUserIds: string[]) => void | Promise<void>;
  onCancel: () => void;
  confirmLabel?: string;
  extraToggle?: { label: string; checked: boolean; onChange: (checked: boolean) => void };
}) {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [restricted, setRestricted] = useState<Set<string>>(new Set(initialRestrictedIds));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/team")
      .then((res) => res.json())
      .then((data) =>
        setMembers((data.members ?? []).filter((m: Member) => m.id !== excludeUserId)),
      );
  }, [excludeUserId]);

  function toggle(id: string) {
    setRestricted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--scrim)] p-4">
      <div className="w-full max-w-sm rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[var(--text-base)] font-semibold">
            <ShieldOff size={16} className="text-[var(--accent)]" />
            {title}
          </h2>
          <button onClick={onCancel} aria-label="Close" className="text-[var(--muted)] hover:text-[var(--ink)]">
            <X size={16} />
          </button>
        </div>
        <p className="mt-1 text-[var(--text-xs)] text-[var(--muted)]">
          Everyone in the workspace can access this by default. Check anyone who should NOT be able to.
        </p>

        {extraToggle && (
          <label className="mt-3 flex items-center gap-2.5 rounded-[var(--radius-sm)] border border-[var(--border)] px-2.5 py-2 text-[var(--text-sm)]">
            <input
              type="checkbox"
              checked={extraToggle.checked}
              onChange={(e) => extraToggle.onChange(e.target.checked)}
              className="h-4 w-4"
            />
            {extraToggle.label}
          </label>
        )}

        <div className="mt-4 flex max-h-64 flex-col gap-1 overflow-y-auto">
          {!members ? (
            <div className="flex justify-center py-6">
              <Loader2 size={16} className="animate-spin text-[var(--muted)]" />
            </div>
          ) : members.length === 0 ? (
            <p className="py-4 text-center text-[var(--text-sm)] text-[var(--muted)]">
              No other members yet.
            </p>
          ) : (
            members.map((m) => (
              <label
                key={m.id}
                className="flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2 py-2 text-[var(--text-sm)] hover:bg-[var(--surface-sunken)]"
              >
                <input
                  type="checkbox"
                  checked={restricted.has(m.id)}
                  onChange={() => toggle(m.id)}
                  className="h-4 w-4"
                />
                {m.full_name ?? "Unnamed member"}
              </label>
            ))
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-[var(--radius)] px-3 py-2 text-[var(--text-sm)] text-[var(--muted)] hover:bg-[var(--surface-sunken)]"
          >
            Cancel
          </button>
          <Button
            size="sm"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onConfirm([...restricted]);
              setBusy(false);
            }}
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
