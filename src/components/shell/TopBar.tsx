import { ThemeToggle } from "@/components/ThemeToggle";
import { SignOutButton } from "@/components/auth/SignOutButton";

export function TopBar({ fullName }: { fullName: string | null }) {
  return (
    <header className="flex h-14 items-center justify-end gap-2 border-b border-[var(--border)] px-6">
      <span className="mr-auto text-[var(--text-sm)] text-[var(--muted)]">
        {fullName}
      </span>
      <ThemeToggle />
      <SignOutButton />
    </header>
  );
}
