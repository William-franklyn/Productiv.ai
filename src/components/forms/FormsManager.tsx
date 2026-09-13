"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface FormRow {
  id: string;
  title: string;
  status: "draft" | "published" | "closed";
  created_at: string;
  responseCount: number;
}

const statusStyles: Record<FormRow["status"], string> = {
  draft: "text-[var(--muted)]",
  published: "text-[var(--success)]",
  closed: "text-[var(--danger)]",
};

export function FormsManager() {
  const router = useRouter();
  const [forms, setForms] = useState<FormRow[] | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/forms")
      .then((res) => res.json())
      .then((data) => setForms(data.forms ?? []));
  }, []);

  async function createForm() {
    setCreating(true);
    const res = await fetch("/api/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled form", fields: [] }),
    });
    const data = await res.json();
    setCreating(false);
    if (res.ok) router.push(`/forms/${data.id}`);
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[var(--text-lg)] font-semibold">Forms</h1>
          <p className="mt-1 text-[var(--text-sm)] text-[var(--muted)]">
            Build a form, send it, and read the responses.
          </p>
        </div>
        <Button onClick={createForm} disabled={creating}>
          {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          New form
        </Button>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        {!forms ? (
          <Loader2 size={18} className="animate-spin text-[var(--muted)]" />
        ) : forms.length === 0 ? (
          <Card className="p-8 text-center text-[var(--text-sm)] text-[var(--muted)]">
            No forms yet — create one to start collecting responses.
          </Card>
        ) : (
          forms.map((f) => (
            <Card
              key={f.id}
              onClick={() => router.push(`/forms/${f.id}`)}
              className="flex cursor-pointer items-center gap-3 p-3.5 hover:bg-[var(--surface-sunken)]"
            >
              <ClipboardList size={18} className="text-[var(--muted)]" />
              <span className="flex-1 truncate text-[var(--text-sm)]">{f.title}</span>
              <span className={`text-[var(--text-xs)] uppercase tracking-wide ${statusStyles[f.status]}`}>
                {f.status}
              </span>
              <span className="text-[var(--text-xs)] text-[var(--muted)]">
                {f.responseCount} response{f.responseCount === 1 ? "" : "s"}
              </span>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
