"use client";

import { GripVertical, Plus, Trash2 } from "lucide-react";
import type { FormField } from "@/lib/forms/types";

const FIELD_TYPES: { value: FormField["type"]; label: string }[] = [
  { value: "text", label: "Short text" },
  { value: "textarea", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "email", label: "Email" },
  { value: "select", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
  { value: "date", label: "Date" },
];

function newField(): FormField {
  return { id: crypto.randomUUID(), label: "", type: "text", required: false };
}

export function FormBuilder({
  title,
  description,
  fields,
  onChange,
}: {
  title: string;
  description: string;
  fields: FormField[];
  onChange: (next: { title?: string; description?: string; fields?: FormField[] }) => void;
}) {
  function updateField(id: string, patch: Partial<FormField>) {
    onChange({ fields: fields.map((f) => (f.id === id ? { ...f, ...patch } : f)) });
  }

  function removeField(id: string) {
    onChange({ fields: fields.filter((f) => f.id !== id) });
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        value={title}
        onChange={(e) => onChange({ title: e.target.value })}
        placeholder="Form title"
        className="h-11 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3.5 text-[var(--text-lg)] font-semibold"
      />
      <textarea
        value={description}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="Description (optional)"
        rows={2}
        className="resize-none rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-[var(--text-sm)]"
      />

      <div className="flex flex-col gap-2">
        {fields.map((field) => (
          <div
            key={field.id}
            className="flex flex-col gap-2 rounded-[var(--radius)] border border-[var(--border)] p-3"
          >
            <div className="flex items-center gap-2">
              <GripVertical size={14} className="shrink-0 text-[var(--muted)]" />
              <input
                value={field.label}
                onChange={(e) => updateField(field.id, { label: e.target.value })}
                placeholder="Question"
                className="h-9 flex-1 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-[var(--text-sm)]"
              />
              <select
                value={field.type}
                onChange={(e) => updateField(field.id, { type: e.target.value as FormField["type"] })}
                className="h-9 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-2 text-[var(--text-sm)]"
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1.5 whitespace-nowrap text-[var(--text-xs)] text-[var(--muted)]">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => updateField(field.id, { required: e.target.checked })}
                />
                Required
              </label>
              <button
                onClick={() => removeField(field.id)}
                aria-label="Remove question"
                className="text-[var(--muted)] hover:text-[var(--danger)]"
              >
                <Trash2 size={15} />
              </button>
            </div>
            {field.type === "select" && (
              <input
                value={(field.options ?? []).join(", ")}
                onChange={(e) =>
                  updateField(field.id, {
                    options: e.target.value
                      .split(",")
                      .map((o) => o.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="Options, comma separated"
                className="h-9 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-[var(--text-sm)]"
              />
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => onChange({ fields: [...fields, newField()] })}
        className="flex w-fit items-center gap-1.5 rounded-[var(--radius)] border border-dashed border-[var(--border)] px-3 py-2 text-[var(--text-sm)] text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--ink)]"
      >
        <Plus size={14} />
        Add question
      </button>
    </div>
  );
}
