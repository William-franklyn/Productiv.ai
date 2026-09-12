"use client";

import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";

export function ViewAsBanner({ role }: { role: string }) {
  const router = useRouter();

  async function exit() {
    await fetch("/api/settings/view-as", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: null }),
    });
    router.refresh();
  }

  return (
    <div className="flex items-center justify-center gap-2 bg-[var(--accent)] px-4 py-1.5 text-[var(--text-xs)] text-[var(--accent-ink)]">
      <Eye size={13} />
      Previewing as {role} — buttons requiring more access are disabled.
      <button onClick={exit} className="ml-2 underline">
        Exit preview
      </button>
    </div>
  );
}
