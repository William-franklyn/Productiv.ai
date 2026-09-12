import type { UIMessage } from "ai";
import { CalendarCheck, CalendarX, FileText, ListTodo, Loader2, Mail } from "lucide-react";
import clsx from "clsx";
import { ChartRenderer } from "@/components/charts/ChartRenderer";
import { ConfidenceBadge } from "./ConfidenceBadge";
import {
  getCancelledMeetings,
  getChart,
  getCitations,
  getCreatedTasks,
  getScheduledMeetings,
  getText,
  isToolPending,
} from "@/lib/ai/message-parts";

export function ChatMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const text = getText(message);
  const citations = isUser ? [] : getCitations(message);
  const chart = isUser ? null : getChart(message);
  const tasks = isUser ? [] : getCreatedTasks(message);
  const scheduledMeetings = isUser ? [] : getScheduledMeetings(message);
  const cancelledMeetings = isUser ? [] : getCancelledMeetings(message);
  const pending = isUser ? null : isToolPending(message);

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-[var(--radius-lg)] bg-[var(--accent-soft)] px-4 py-2.5 text-[var(--text-base)]">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {text && (
        <p className="whitespace-pre-wrap text-[var(--text-base)] leading-relaxed">
          {text}
        </p>
      )}

      {pending && (
        <div className="flex items-center gap-2 text-[var(--text-sm)] text-[var(--muted)]">
          <Loader2 size={14} className="animate-spin" />
          {pending}
        </div>
      )}

      {chart && <ChartRenderer spec={chart} />}

      {tasks.map((t, i) => (
        <div
          key={i}
          className="flex items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] px-3 py-2 text-[var(--text-sm)]"
        >
          <ListTodo size={15} className="text-[var(--accent)]" />
          Created task: {t.title}
        </div>
      ))}

      {scheduledMeetings.map((m, i) => (
        <div
          key={i}
          className="flex flex-col gap-1 rounded-[var(--radius)] border border-[var(--border)] px-3 py-2 text-[var(--text-sm)]"
        >
          <div className="flex items-center gap-2">
            <CalendarCheck size={15} className="text-[var(--accent)]" />
            Scheduled: {m.title} · {new Date(m.startsAt).toLocaleString()}
          </div>
          {m.attendeeEmail && (
            <div className="ml-[23px] flex items-center gap-1.5 text-[var(--text-xs)] text-[var(--muted)]">
              <Mail size={11} />
              {m.emailSent
                ? `Invite emailed to ${m.attendeeEmail}`
                : `Could not email ${m.attendeeEmail} — check RESEND_API_KEY`}
            </div>
          )}
        </div>
      ))}

      {cancelledMeetings.map((m, i) => (
        <div
          key={i}
          className="flex items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] px-3 py-2 text-[var(--text-sm)]"
        >
          <CalendarX size={15} className="text-[var(--danger)]" />
          Cancelled: {m.title}
        </div>
      ))}

      {citations.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {citations.map((c) => (
            <span
              key={c.sourceId}
              className={clsx(
                "inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-2.5 py-1 text-[var(--text-xs)] text-[var(--muted)]",
              )}
            >
              <FileText size={11} />
              {c.sourceName}
            </span>
          ))}
          <ConfidenceBadge sourceCount={citations.length} />
        </div>
      )}
    </div>
  );
}
