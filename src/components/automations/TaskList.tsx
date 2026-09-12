"use client";

import { useCallback, useEffect, useState } from "react";
import { Check } from "lucide-react";
import clsx from "clsx";
import { Card } from "@/components/ui/Card";

interface Task {
  id: string;
  title: string;
  status: "open" | "done";
  due_date: string | null;
}

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div>
      <h1 className="text-xl font-semibold">Automations</h1>
      <p className="mt-1 text-[var(--text-sm)] text-[var(--muted)]">
        Tasks the assistant creates on your behalf land here.
      </p>

      <div className="mt-6 flex flex-col gap-2">
        {loading && <p className="text-[var(--text-sm)] text-[var(--muted)]">Loading…</p>}
        {!loading && tasks.length === 0 && (
          <Card className="p-8 text-center text-[var(--text-sm)] text-[var(--muted)]">
            No tasks yet — ask the assistant to create one.
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
