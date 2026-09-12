"use client";

import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { Card } from "@/components/ui/Card";

const previewable: Record<"owner" | "admin", ("admin" | "member")[]> = {
  owner: ["admin", "member"],
  admin: ["member"],
};

export function ViewAsControl({ realRole }: { realRole: "owner" | "admin" | "member" }) {
  const router = useRouter();
  if (realRole === "member") return null;

  async function setRole(role: "owner" | "admin" | "member" | null) {
    await fetch("/api/settings/view-as", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    router.refresh();
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <Eye size={18} className="text-[var(--accent)]" />
        <h3 className="text-[var(--text-base)] font-medium">Preview as a role</h3>
      </div>
      <p className="mt-1 text-[var(--text-sm)] text-[var(--muted)]">
        See what the app looks like for a less-privileged role — buttons that
        require permissions you don't have in that role are actually
        disabled, not just hidden.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {previewable[realRole as "owner" | "admin"].map((role) => (
          <button
            key={role}
            onClick={() => setRole(role)}
            className="rounded-[var(--radius)] border border-[var(--border)] px-3 py-1.5 text-[var(--text-sm)] capitalize hover:bg-[var(--accent-soft)]"
          >
            View as {role}
          </button>
        ))}
      </div>
    </Card>
  );
}
