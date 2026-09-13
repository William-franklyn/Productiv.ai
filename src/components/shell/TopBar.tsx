"use client";

import { Menu } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { useOpenCommandPalette } from "@/lib/command-palette-context";

export function TopBar({
  fullName,
  onOpenNav,
}: {
  fullName: string | null;
  onOpenNav?: () => void;
}) {
  const openPalette = useOpenCommandPalette();

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[var(--border)] px-4 sm:px-6">
      {onOpenNav && (
        <button
          onClick={onOpenNav}
          aria-label="Open navigation"
          className="-ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius)] text-[var(--muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--ink)] md:hidden"
        >
          <Menu size={18} />
        </button>
      )}

      <span className="mr-auto min-w-0 truncate text-[var(--text-sm)] text-[var(--muted)]">
        {fullName}
      </span>

      {/* The palette is keyboard-first and the shortcut hint is meaningless on
          a phone, so the trigger stays desktop-only rather than shipping a
          button that advertises a key you can't press. */}
      <button
        onClick={openPalette}
        className="hidden items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border)] px-2.5 py-1.5 text-[var(--text-xs)] text-[var(--muted)] transition-colors hover:bg-[var(--surface-sunken)] sm:flex"
      >
        Search
        <kbd className="rounded-[var(--radius-sm)] border border-[var(--border)] px-1 font-sans">⌘K</kbd>
      </button>
      <ThemeToggle />
      <SignOutButton />
    </header>
  );
}
