import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function MarketingHeader() {
  return (
    <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
      <Link href="/" className="text-[var(--text-lg)] font-semibold">
        ProductivAI
      </Link>
      <nav className="flex items-center gap-1">
        <Link
          href="/pricing"
          className="px-3 py-2 text-[var(--text-sm)] text-[var(--muted)] hover:text-[var(--ink)]"
        >
          Pricing
        </Link>
        <Link
          href="/security"
          className="px-3 py-2 text-[var(--text-sm)] text-[var(--muted)] hover:text-[var(--ink)]"
        >
          Security
        </Link>
        <Link
          href="/login"
          className="px-3 py-2 text-[var(--text-sm)] text-[var(--muted)] hover:text-[var(--ink)]"
        >
          Sign in
        </Link>
        <Link href="/signup" className="ml-2">
          <Button size="sm">Get started</Button>
        </Link>
      </nav>
    </header>
  );
}
