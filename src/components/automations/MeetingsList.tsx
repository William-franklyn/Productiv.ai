"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface Meeting {
  id: string;
  title: string;
  starts_at: string;
  duration_minutes: number;
  notes: string | null;
}

export function MeetingsList() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");

  const refresh = useCallback(async () => {
    const res = await fetch("/api/meetings");
    if (res.ok) {
      const body = await res.json();
      setMeetings(body.meetings);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !startsAt) return;

    await fetch("/api/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, startsAt: new Date(startsAt).toISOString() }),
    });
    setTitle("");
    setStartsAt("");
    setShowForm(false);
    refresh();
  }

  async function onDelete(id: string) {
    setMeetings((prev) => prev.filter((m) => m.id !== id));
    await fetch(`/api/meetings/${id}`, { method: "DELETE" });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-[var(--text-base)] font-medium">Meetings</h2>
        <Button size="sm" variant="secondary" onClick={() => setShowForm((s) => !s)}>
          <Plus size={14} />
          Schedule
        </Button>
      </div>

      {showForm && (
        <form onSubmit={onCreate} className="mt-3 flex flex-wrap items-end gap-2">
          <input
            required
            placeholder="Meeting title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-9 flex-1 min-w-[160px] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--text-sm)]"
          />
          <input
            required
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="h-9 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--text-sm)]"
          />
          <Button type="submit" size="sm">Add</Button>
        </form>
      )}

      <div className="mt-3 flex flex-col gap-2">
        {loading && <p className="text-[var(--text-sm)] text-[var(--muted)]">Loading…</p>}
        {!loading && meetings.length === 0 && (
          <Card className="p-6 text-center text-[var(--text-sm)] text-[var(--muted)]">
            No meetings scheduled — ask the assistant or use Schedule above.
          </Card>
        )}
        {meetings.map((m) => (
          <Card key={m.id} className="flex items-center gap-3 p-3.5">
            <div className="flex-1">
              <p className="text-[var(--text-sm)]">{m.title}</p>
              <p className="text-[var(--text-xs)] text-[var(--muted)]">
                {new Date(m.starts_at).toLocaleString()} · {m.duration_minutes} min
              </p>
            </div>
            <button
              onClick={() => onDelete(m.id)}
              aria-label="Delete meeting"
              className="text-[var(--muted)] hover:text-[var(--danger)]"
            >
              <Trash2 size={15} />
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}
