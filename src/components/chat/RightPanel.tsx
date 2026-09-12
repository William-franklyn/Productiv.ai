"use client";

import { useState } from "react";
import { FileText, ShieldCheck } from "lucide-react";
import clsx from "clsx";
import type { CitedChunk } from "@/lib/chat/citations";

const tabs = ["Sources", "Permissions"] as const;
type Tab = (typeof tabs)[number];

export function RightPanel({
  sources,
  activeIndex,
  orgName,
}: {
  sources: CitedChunk[];
  activeIndex: number | null;
  orgName: string;
}) {
  const [tab, setTab] = useState<Tab>("Sources");

  return (
    <aside className="flex w-80 flex-col border-l border-[var(--border)]">
      <div className="flex border-b border-[var(--border)]">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              "flex-1 px-3 py-2.5 text-[var(--text-sm)]",
              tab === t
                ? "border-b-2 border-[var(--accent)] font-medium text-[var(--ink)]"
                : "text-[var(--muted)]",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === "Sources" && (
          <div className="flex flex-col gap-3">
            {sources.length === 0 && (
              <p className="text-[var(--text-sm)] text-[var(--muted)]">
                Sources used in the current answer will show up here.
              </p>
            )}
            {sources.map((s, i) => (
              <div
                key={i}
                id={`source-${i + 1}`}
                className={clsx(
                  "rounded-[var(--radius)] border p-3 transition-colors",
                  activeIndex === i
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--border)]",
                )}
              >
                <div className="flex items-center gap-1.5 text-[var(--text-sm)] font-medium">
                  <FileText size={13} className="text-[var(--muted)]" />
                  [{i + 1}] {s.sourceName}
                </div>
                <p className="mt-1.5 text-[var(--text-xs)] text-[var(--muted)]">
                  {s.content}
                </p>
              </div>
            ))}
          </div>
        )}

        {tab === "Permissions" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />
              <p className="text-[var(--text-sm)]">
                Everyone in <strong>{orgName}</strong> can see this answer and
                the documents behind it.
              </p>
            </div>
            <p className="text-[var(--text-xs)] text-[var(--muted)]">
              ProductivAI's knowledge base is shared workspace-wide — there's
              no per-document access control yet, so nothing here is filtered
              by who's asking.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
