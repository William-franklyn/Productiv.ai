"use client";

import { ThemeToggle } from "@/components/ThemeToggle";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { useOpenCommandPalette } from "@/lib/command-palette-context";

export function TopBar({ fullName }: { fullName: string | null }) {
  const openPalette = useOpenCommandPalette();

  return (
    <header className="flex h-14 items-center justify-end gap-2 border-b border-[var(--border)] px-6">
      <span className="mr-auto text-[var(--text-sm)] text-[var(--muted)]">
        {fullName}
      </span>
      <button
        onClick={openPalette}
        className="flex items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border)] px-2.5 py-1.5 text-[var(--text-xs)] text-[var(--muted)] hover:bg-[var(--accent-soft)]"
      >
        Search
        <kbd className="rounded border border-[var(--border)] px-1 font-sans">⌘K</kbd>
      </button>
      <ThemeToggle />
      <SignOutButton />
    </header>
  );
}
