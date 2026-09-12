"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Link as LinkIcon, Loader2, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormBuilder } from "./FormBuilder";
import { SendFormModal } from "./SendFormModal";
import type { FormField } from "@/lib/forms/types";

interface FormData {
  id: string;
  title: string;
  description: string | null;
  fields: FormField[];
  status: "draft" | "published" | "closed";
}

interface ResponseRow {
  id: string;
  answers: Record<string, string | number | boolean>;
  respondent_email: string | null;
  submitted_at: string;
}

export function FormEditor({ formId }: { formId: string }) {
  const router = useRouter();
  const [form, setForm] = useState<FormData | null>(null);
  const [tab, setTab] = useState<"build" | "responses">("build");
  const [responses, setResponses] = useState<ResponseRow[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`/api/forms/${formId}`)
      .then((res) => res.json())
      .then((data) => setForm(data.form));
  }, [formId]);

  useEffect(() => {
    if (tab !== "responses") return;
    fetch(`/api/forms/${formId}/responses`)
      .then((res) => res.json())
      .then((data) => setResponses(data.responses ?? []));
  }, [tab, formId]);

  function update(patch: Partial<FormData>) {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  async function save(extra?: Partial<FormData>) {
    if (!form) return;
    setSaving(true);
    const payload = { title: form.title, description: form.description, fields: form.fields, ...extra };
    await fetch(`/api/forms/${formId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (extra?.status) update(extra);
  }

  async function remove() {
    await fetch(`/api/forms/${formId}`, { method: "DELETE" });
    router.push("/forms");
  }

  function copyLink() {
    const url = `${window.location.origin}/f/${formId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!form) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 size={20} className="animate-spin text-[var(--muted)]" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-[var(--radius)] border border-[var(--border)] p-1">
          {(["build", "responses"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-[var(--radius-sm)] px-3 py-1.5 text-[var(--text-sm)] capitalize ${
                tab === t ? "bg-[var(--accent-soft)] font-medium" : "text-[var(--muted)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[var(--text-xs)] uppercase tracking-wide text-[var(--muted)]">
            {form.status}
          </span>
          <Button variant="secondary" size="sm" onClick={copyLink}>
            {copied ? <Check size={14} /> : <LinkIcon size={14} />}
            Copy link
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSending(true)}
            disabled={form.status !== "published"}
          >
            <Send size={14} />
            Send
          </Button>
          {form.status === "draft" ? (
            <Button size="sm" onClick={() => save({ status: "published" })} disabled={saving}>
              Publish
            </Button>
          ) : form.status === "published" ? (
            <Button variant="secondary" size="sm" onClick={() => save({ status: "closed" })} disabled={saving}>
              Close
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => save({ status: "published" })} disabled={saving}>
              Reopen
            </Button>
          )}
          <button onClick={remove} aria-label="Delete form" className="text-[var(--muted)] hover:text-[var(--danger)]">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {tab === "build" ? (
        <div className="mx-auto mt-6 max-w-2xl">
          <FormBuilder
            title={form.title}
            description={form.description ?? ""}
            fields={form.fields}
            onChange={(patch) => update(patch)}
          />
          <div className="mt-4 flex justify-end">
            <Button size="sm" onClick={() => save()} disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-6">
          {!responses ? (
            <Loader2 size={18} className="animate-spin text-[var(--muted)]" />
          ) : responses.length === 0 ? (
            <Card className="p-8 text-center text-[var(--text-sm)] text-[var(--muted)]">
              No responses yet.
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border)]">
              <table className="w-full text-[var(--text-sm)]">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-[var(--text-xs)] text-[var(--muted)]">
                    <th className="px-3 py-2">Submitted</th>
                    {form.fields.map((f) => (
                      <th key={f.id} className="px-3 py-2">
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {responses.map((r) => (
                    <tr key={r.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="whitespace-nowrap px-3 py-2 text-[var(--muted)]">
                        {new Date(r.submitted_at).toLocaleString()}
                      </td>
                      {form.fields.map((f) => (
                        <td key={f.id} className="px-3 py-2">
                          {String(r.answers[f.id] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {sending && <SendFormModal formId={formId} onClose={() => setSending(false)} />}
    </div>
  );
}
