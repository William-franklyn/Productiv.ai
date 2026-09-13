"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronsLeft, ChevronsRight, ChevronsUpDown, Check, Plus } from "lucide-react";
import clsx from "clsx";
import { navItems } from "@/lib/nav";
import type { WorkspaceMembership } from "@/lib/auth/guard";

const STORAGE_KEY = "productivai-sidebar-collapsed";

function WorkspaceSwitcher({
  orgId,
  orgName,
  memberships,
  collapsed,
}: {
  orgId: string;
  orgName: string;
  memberships: WorkspaceMembership[];
  collapsed: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  async function switchTo(id: string) {
    if (id === orgId || busy) return;
    setBusy(true);
    const res = await fetch("/api/workspaces/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId: id }),
    });
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      router.push("/dashboard");
      router.refresh();
    }
  }

  async function createWorkspace() {
    if (!newName.trim() || busy) return;
    setBusy(true);
    const res = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    setBusy(false);
    if (res.ok) {
      setNewName("");
      setCreating(false);
      setOpen(false);
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title={collapsed ? orgName : undefined}
        className={clsx(
          "flex items-center gap-1.5 rounded-[var(--radius-sm)] text-left hover:bg-[var(--accent-soft)]",
          collapsed ? "h-8 w-8 justify-center" : "w-full px-1.5 py-1",
        )}
      >
        {collapsed ? (
          <span className="text-[var(--text-xs)] font-semibold">{orgName.slice(0, 1).toUpperCase()}</span>
        ) : (
          <>
            <span className="max-w-[8rem] truncate text-[var(--text-xs)] text-[var(--muted)]">{orgName}</span>
            <ChevronsUpDown size={12} className="shrink-0 text-[var(--muted)]" />
          </>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg">
          <div className="px-2 py-1 text-[var(--text-xs)] font-medium uppercase tracking-wide text-[var(--muted)]">
            Workspaces
          </div>
          {memberships.map((m) => (
            <button
              key={m.orgId}
              onClick={() => switchTo(m.orgId)}
              disabled={busy}
              className="flex w-full items-center justify-between gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-[var(--text-sm)] hover:bg-[var(--accent-soft)] disabled:opacity-60"
            >
              <span className="truncate">{m.orgName}</span>
              {m.orgId === orgId && <Check size={14} className="shrink-0 text-[var(--accent)]" />}
            </button>
          ))}

          <div className="my-1 border-t border-[var(--border)]" />

          {creating ? (
            <div className="flex flex-col gap-1.5 p-1.5">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createWorkspace()}
                placeholder="Workspace name"
                className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-[var(--text-sm)]"
              />
              <button
                onClick={createWorkspace}
                disabled={busy || !newName.trim()}
                className="rounded-[var(--radius-sm)] bg-[var(--accent)] px-2 py-1 text-[var(--text-sm)] font-medium text-[var(--accent-ink)] disabled:opacity-60"
              >
                Create
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="flex w-full items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-[var(--text-sm)] text-[var(--muted)] hover:bg-[var(--accent-soft)]"
            >
              <Plus size={14} /> New workspace
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function Sidebar({
  orgId,
  orgName,
  memberships,
}: {
  orgId: string;
  orgName: string;
  memberships: WorkspaceMembership[];
}) {
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
        {!collapsed && <div className="text-[var(--text-base)] font-semibold">ProductivAI</div>}
        <button
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--ink)]"
        >
          {collapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
        </button>
      </div>

      <div className={clsx("mt-3", collapsed ? "" : "px-1")}>
        <WorkspaceSwitcher orgId={orgId} orgName={orgName} memberships={memberships} collapsed={collapsed} />
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
