import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-[var(--border)] py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-6 text-[var(--text-sm)] text-[var(--muted)] sm:flex-row sm:justify-between">
        <span>ProductivAI</span>
        <nav className="flex items-center gap-4">
          <Link href="/" className="hover:text-[var(--ink)]">
            Home
          </Link>
          <Link href="/pricing" className="hover:text-[var(--ink)]">
            Pricing
          </Link>
          <Link href="/security" className="hover:text-[var(--ink)]">
            Security
          </Link>
        </nav>
      </div>
    </footer>
  );
}
