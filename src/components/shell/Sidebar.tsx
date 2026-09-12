"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import clsx from "clsx";
import { navItems } from "@/lib/nav";

const STORAGE_KEY = "productivai-sidebar-collapsed";

export function Sidebar({ orgName }: { orgName: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <aside
      className={clsx(
        "flex flex-col border-r border-[var(--border)] bg-[var(--surface)] p-4 transition-[width] duration-150",
        collapsed ? "w-16 items-center" : "w-56",
      )}
    >
      <div className={clsx("flex items-center", collapsed ? "flex-col gap-2" : "justify-between px-2")}>
        {!collapsed && (
          <div>
            <div className="text-[var(--text-base)] font-semibold">ProductivAI</div>
            <div className="mt-1 max-w-[9rem] truncate text-[var(--text-xs)] text-[var(--muted)]">
              {orgName}
            </div>
          </div>
        )}
        <button
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--ink)]"
        >
          {collapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
        </button>
      </div>

      <nav className={clsx("mt-6 flex flex-col gap-1", collapsed && "w-full items-center")}>
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={clsx(
                "flex items-center gap-2.5 rounded-[var(--radius)] text-[var(--text-sm)] transition-colors",
                collapsed ? "h-9 w-9 justify-center" : "px-2.5 py-2",
                active
                  ? "bg-[var(--accent-soft)] text-[var(--ink)] font-medium"
                  : "text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--ink)]",
              )}
            >
              <item.icon size={16} />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
