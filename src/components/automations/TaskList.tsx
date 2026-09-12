"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Plus, User } from "lucide-react";
import clsx from "clsx";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface Task {
  id: string;
  title: string;
  status: "open" | "done";
  due_date: string | null;
  assigned_to: string | null;
  assigneeName: string | null;
}

interface Member {
  id: string;
  full_name: string | null;
}

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  const refresh = useCallback(async () => {
    const res = await fetch("/api/automations/tasks");
    if (res.ok) {
      const body = await res.json();
      setTasks(body.tasks);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    fetch("/api/team")
      .then((res) => res.json())
      .then((data) => setMembers(data.members ?? []));
  }, [refresh]);

  async function toggle(task: Task) {
    const nextStatus = task.status === "open" ? "done" : "open";
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)),
    );
    await fetch(`/api/automations/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    await fetch("/api/automations/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        dueDate: dueDate || undefined,
        assignedTo: assignedTo || undefined,
      }),
    });
    setTitle("");
    setDueDate("");
    setAssignedTo("");
    setShowForm(false);
    refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Automations</h1>
          <p className="mt-1 text-[var(--text-sm)] text-[var(--muted)]">
            Tasks the team or the assistant creates land here.
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setShowForm((s) => !s)}>
          <Plus size={14} />
          New task
        </Button>
      </div>

      {showForm && (
        <form onSubmit={onCreate} className="mt-4 flex flex-wrap items-end gap-2">
          <input
            required
            placeholder="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-9 min-w-[200px] flex-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--text-sm)]"
          />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="h-9 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--text-sm)]"
          />
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="h-9 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-2 text-[var(--text-sm)]"
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name ?? "Unnamed member"}
              </option>
            ))}
          </select>
          <Button type="submit" size="sm">
            Add
          </Button>
        </form>
      )}

      <div className="mt-6 flex flex-col gap-2">
        {loading && <p className="text-[var(--text-sm)] text-[var(--muted)]">Loading…</p>}
        {!loading && tasks.length === 0 && (
          <Card className="p-8 text-center text-[var(--text-sm)] text-[var(--muted)]">
            No tasks yet — create one above or ask the assistant.
          </Card>
        )}
        {tasks.map((task) => (
          <Card key={task.id} className="flex items-center gap-3 p-3.5">
            <button
              onClick={() => toggle(task)}
              aria-label="Toggle done"
              className={clsx(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border",
                task.status === "done"
                  ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]"
                  : "border-[var(--border)]",
              )}
            >
              {task.status === "done" && <Check size={12} />}
            </button>
            <span
              className={clsx(
                "flex-1 text-[var(--text-sm)]",
                task.status === "done" && "text-[var(--muted)] line-through",
              )}
            >
              {task.title}
            </span>
            {task.assigneeName && (
              <span className="flex items-center gap-1 text-[var(--text-xs)] text-[var(--muted)]">
                <User size={11} />
                {task.assigneeName}
              </span>
            )}
            {task.due_date && (
              <span className="text-[var(--text-xs)] text-[var(--muted)]">
                {task.due_date}
              </span>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
