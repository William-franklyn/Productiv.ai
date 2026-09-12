"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { navItems } from "@/lib/nav";

export function Sidebar({ orgName }: { orgName: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 flex-col border-r border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="px-2 text-[var(--text-base)] font-semibold">
        ProductivAI
      </div>
      <div className="mt-1 truncate px-2 text-[var(--text-xs)] text-[var(--muted)]">
        {orgName}
      </div>

      <nav className="mt-6 flex flex-col gap-1">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-2.5 rounded-[var(--radius)] px-2.5 py-2 text-[var(--text-sm)] transition-colors",
                active
                  ? "bg-[var(--accent-soft)] text-[var(--ink)] font-medium"
                  : "text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--ink)]",
              )}
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
