"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Sparkles, History, type LucideIcon } from "lucide-react";
import { navItems } from "@/lib/nav";

interface PaletteAction {
  id: string;
  label: string;
  icon: LucideIcon;
  run: () => void;
}

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setHighlighted(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  if (!open) return null;

  const actions: PaletteAction[] = [
    {
      id: "assistant",
      label: "Ask the assistant",
      icon: Plus,
      run: () => router.push("/assistant"),
    },
    {
      id: "capabilities",
      label: "What can iRABU do?",
      icon: Sparkles,
      run: () => router.push("/capabilities"),
    },
    {
      id: "activity",
      label: "Go to Activity",
      icon: History,
      run: () => router.push("/activity"),
    },
    ...navItems.map((item) => ({
      id: item.href,
      label: `Go to ${item.label}`,
      icon: item.icon,
      run: () => router.push(item.href as Parameters<typeof router.push>[0]),
    })),
  ];

  const q = query.trim().toLowerCase();
  const results = q ? actions.filter((a) => a.label.toLowerCase().includes(q)) : actions;

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const action = results[highlighted];
      if (action) {
        onClose();
        action.run();
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[15vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-menu)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-[var(--border)] px-4 py-3">
          <Search size={16} className="text-[var(--muted)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlighted(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Jump to a page or start something new…"
            className="flex-1 bg-transparent text-[var(--text-base)] outline-none placeholder:text-[var(--muted)]"
          />
        </div>
        <div className="max-h-80 overflow-y-auto p-1.5">
          {results.length === 0 && (
            <p className="px-3 py-4 text-center text-[var(--text-sm)] text-[var(--muted)]">
              No matches.
            </p>
          )}
          {results.map((action, i) => (
            <button
              key={action.id}
              onClick={() => {
                onClose();
                action.run();
              }}
              onMouseEnter={() => setHighlighted(i)}
              className={`flex w-full items-center gap-2.5 rounded-[var(--radius)] px-3 py-2 text-left text-[var(--text-sm)] ${
                i === highlighted ? "bg-[var(--accent-soft)]" : ""
              }`}
            >
              <action.icon size={15} className="text-[var(--muted)]" />
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
