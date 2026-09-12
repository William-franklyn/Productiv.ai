"use client";

import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { CAPABILITIES, NOT_YET } from "@/lib/capabilities";

export function CapabilitiesGrid() {
  const router = useRouter();

  function tryIt(example: string) {
    router.push(`/assistant?q=${encodeURIComponent(example)}`);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {CAPABILITIES.map((c) => (
          <Card key={c.id} className="p-4">
            <h3 className="text-[var(--text-base)] font-medium">{c.title}</h3>
            <p className="mt-1.5 text-[var(--text-sm)] text-[var(--muted)]">{c.detail}</p>
            <button
              onClick={() => tryIt(c.example)}
              className="mt-3 w-full rounded-[var(--radius)] border border-[var(--border)] px-3 py-2 text-left text-[var(--text-sm)] hover:border-[var(--accent)]"
            >
              &ldquo;{c.example}&rdquo;
            </button>
          </Card>
        ))}
      </div>

      <div>
        <div className="flex items-center gap-2">
          <Ban size={16} className="text-[var(--muted)]" />
          <h2 className="text-[var(--text-base)] font-medium">Not yet</h2>
        </div>
        <ul className="mt-3 flex flex-col gap-2">
          {NOT_YET.map((item) => (
            <li key={item} className="text-[var(--text-sm)] text-[var(--muted)]">
              — {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
