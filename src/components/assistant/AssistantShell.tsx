"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { ChatSidebar } from "./ChatSidebar";

/**
 * Owns the mobile drawer state for the chat shell, the same way AppShell does
 * for the product shell. The hamburger is rendered here rather than inside
 * ChatPanel so the chat surface doesn't have to know the shell exists.
 */
export function AssistantShell({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="flex h-screen">
      <ChatSidebar mobileOpen={navOpen} onCloseMobile={() => setNavOpen(false)} />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <button
          onClick={() => setNavOpen(true)}
          aria-label="Open chat history"
          className="absolute left-3 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-[var(--radius)] text-[var(--muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--ink)] md:hidden"
        >
          <Menu size={18} />
        </button>
        {children}
      </div>
    </div>
  );
}
