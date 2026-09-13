"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Loader2, ShieldCheck, ShieldOff, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AccessPicker } from "./AccessPicker";
import { createClient } from "@/lib/supabase/client";

interface Source {
  id: string;
  name: string;
  mime_type: string;
  status: "processing" | "ready" | "failed";
  error: string | null;
  created_at: string;
  restrictedCount: number;
  requires_verification: boolean;
}

const statusStyles: Record<Source["status"], string> = {
  ready: "text-[var(--success)]",
  processing: "text-[var(--warning)]",
  failed: "text-[var(--danger)]",
};

const statusLabels: Record<Source["status"], string> = {
  ready: "Ready",
  processing: "Processing",
  failed: "Failed",
};

export function KnowledgeManager({ canMarkSensitive }: { canMarkSensitive: boolean }) {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingSensitive, setPendingSensitive] = useState(false);
  const [managingSourceId, setManagingSourceId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/knowledge/sources");
    if (res.ok) {
      const body = await res.json();
      setSources(body.sources);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    createClient()
      .auth.getUser()
      .then(({ data }) => setUserId(data.user?.id));
  }, [refresh]);

  async function upload(file: File, restrictedUserIds: string[], requiresVerification: boolean) {
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    if (restrictedUserIds.length > 0) {
      formData.append("restrictedUserIds", restrictedUserIds.join(","));
    }
    if (requiresVerification) {
      formData.append("requiresVerification", "true");
    }

    const res = await fetch("/api/knowledge/sources", { method: "POST", body: formData });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Upload failed");
    }

    setUploading(false);
    setPendingFile(null);
    setPendingSensitive(false);
    if (inputRef.current) inputRef.current.value = "";
    refresh();
  }

  async function onDelete(id: string) {
    setSources((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/knowledge/sources/${id}`, { method: "DELETE" });
  }

  async function saveRestrictions(sourceId: string, restrictedUserIds: string[]) {
    await fetch(`/api/knowledge/sources/${sourceId}/restrictions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restrictedUserIds }),
    });
    setManagingSourceId(null);
    refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[var(--text-lg)] font-semibold">Knowledge</h1>
          <p className="mt-1 text-[var(--text-sm)] text-[var(--muted)]">
            Upload documents to make them askable in the assistant.
          </p>
        </div>
        <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {uploading ? "Processing…" : "Upload"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.md,.csv,.json,.pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setPendingFile(file);
          }}
        />
      </div>

      {error && <p className="mt-4 text-[var(--text-sm)] text-[var(--danger)]">{error}</p>}

      <div className="mt-6 flex flex-col gap-2">
        {loading && <p className="text-[var(--text-sm)] text-[var(--muted)]">Loading…</p>}
        {!loading && sources.length === 0 && (
          <Card className="p-8 text-center text-[var(--text-sm)] text-[var(--muted)]">
            No documents yet — upload one to get started.
          </Card>
        )}
        {sources.map((source) => (
          <Card
            key={source.id}
            className="flex items-center gap-3 p-3.5"
            title={source.status === "failed" ? source.error ?? undefined : undefined}
          >
            <FileText size={18} className="text-[var(--muted)]" />
            <span className="flex-1 truncate text-[var(--text-sm)]">{source.name}</span>
            {source.requires_verification && (
              <span
                title="Requires verified identity + admin approval to read"
                className="flex items-center gap-1 text-[var(--text-xs)] text-[var(--accent)]"
              >
                <ShieldCheck size={12} />
                Sensitive
              </span>
            )}
            {source.restrictedCount > 0 && (
              <span className="flex items-center gap-1 text-[var(--text-xs)] text-[var(--muted)]">
                <ShieldOff size={12} />
                {source.restrictedCount} restricted
              </span>
            )}
            <span className={`text-[var(--text-xs)] ${statusStyles[source.status]}`}>
              {statusLabels[source.status]}
            </span>
            <button
              onClick={() => setManagingSourceId(source.id)}
              aria-label="Manage access"
              title="Manage access"
              className="text-[var(--muted)] hover:text-[var(--ink)]"
            >
              <ShieldOff size={15} />
            </button>
            <button
              onClick={() => onDelete(source.id)}
              aria-label="Delete"
              className="text-[var(--muted)] hover:text-[var(--danger)]"
            >
              <Trash2 size={15} />
            </button>
          </Card>
        ))}
      </div>

      {pendingFile && (
        <AccessPicker
          title={`Upload "${pendingFile.name}"`}
          initialRestrictedIds={[]}
          excludeUserId={userId}
          confirmLabel="Upload"
          onCancel={() => {
            setPendingFile(null);
            setPendingSensitive(false);
            if (inputRef.current) inputRef.current.value = "";
          }}
          onConfirm={(restrictedUserIds) => upload(pendingFile, restrictedUserIds, pendingSensitive)}
          extraToggle={
            canMarkSensitive
              ? {
                  label: "Sensitive — requires verified identity + admin approval to read",
                  checked: pendingSensitive,
                  onChange: setPendingSensitive,
                }
              : undefined
          }
        />
      )}

      {managingSourceId && (
        <ManageAccessDialog
          sourceId={managingSourceId}
          excludeUserId={userId}
          onCancel={() => setManagingSourceId(null)}
          onSave={(ids) => saveRestrictions(managingSourceId, ids)}
        />
      )}
    </div>
  );
}

function ManageAccessDialog({
  sourceId,
  excludeUserId,
  onCancel,
  onSave,
}: {
  sourceId: string;
  excludeUserId?: string;
  onCancel: () => void;
  onSave: (restrictedUserIds: string[]) => void | Promise<void>;
}) {
  const [initialIds, setInitialIds] = useState<string[] | null>(null);

  useEffect(() => {
    fetch(`/api/knowledge/sources/${sourceId}/restrictions`)
      .then((res) => res.json())
      .then((data) => setInitialIds(data.restrictedUserIds ?? []));
  }, [sourceId]);

  if (!initialIds) return null;

  return (
    <AccessPicker
      title="Manage access"
      initialRestrictedIds={initialIds}
      excludeUserId={excludeUserId}
      onCancel={onCancel}
      onConfirm={onSave}
    />
  );
}
