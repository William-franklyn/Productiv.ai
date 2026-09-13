import type { UIMessage } from "ai";
import {
  ArrowDownToLine,
  BarChart3,
  CalendarCheck,
  CalendarX,
  Check,
  CircleDollarSign,
  ClipboardList,
  ExternalLink,
  FileText,
  ListTodo,
  Loader2,
  Mail,
  ShieldOff,
  Sparkles,
  Wallet,
} from "lucide-react";
import clsx from "clsx";
import { ChartRenderer } from "@/components/charts/ChartRenderer";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { Markdown } from "./Markdown";
import {
  getAccessChanges,
  getAccountBalance,
  getCancelledMeetings,
  getChart,
  getCitations,
  getCompletedTasks,
  getCreatedForms,
  getCreatedTasks,
  getDataAnalysis,
  getDraftedPayment,
  getEmailDraft,
  getReceivedPayment,
  getScheduledMeetings,
  getText,
  isToolPending,
} from "@/lib/ai/message-parts";

export function ChatMessage({
  message,
  onOpenDraft,
  onOpenPayment,
}: {
  message: UIMessage;
  onOpenDraft?: (draftId: string) => void;
  onOpenPayment?: (paymentId: string) => void;
}) {
  const isUser = message.role === "user";
  const text = getText(message);
  const citations = isUser ? [] : getCitations(message);
  const chart = isUser ? null : getChart(message);
  const tasks = isUser ? [] : getCreatedTasks(message);
  const completedTasks = isUser ? [] : getCompletedTasks(message);
  const scheduledMeetings = isUser ? [] : getScheduledMeetings(message);
  const cancelledMeetings = isUser ? [] : getCancelledMeetings(message);
  const emailDraft = isUser ? null : getEmailDraft(message);
  const analyses = isUser ? [] : getDataAnalysis(message);
  const accessChanges = isUser ? [] : getAccessChanges(message);
  const createdForms = isUser ? [] : getCreatedForms(message);
  const balance = isUser ? null : getAccountBalance(message);
  const draftedPayment = isUser ? null : getDraftedPayment(message);
  const receivedPayment = isUser ? null : getReceivedPayment(message);
  const pending = isUser ? null : isToolPending(message);

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-[var(--radius-lg)] bg-[var(--accent-soft)] px-4 py-2.5 text-[var(--text-base)] whitespace-pre-wrap">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)]">
        <Sparkles size={13} className="text-[var(--muted)]" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
      {text && <Markdown text={text} />}

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
          {t.assigneeName && (
            <span className="text-[var(--text-xs)] text-[var(--muted)]">→ {t.assigneeName}</span>
          )}
        </div>
      ))}

      {completedTasks.map((t, i) => (
        <div
          key={i}
          className="flex items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] px-3 py-2 text-[var(--text-sm)]"
        >
          <Check size={15} className="text-[var(--success)]" />
          Completed: {t.title}
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

      {analyses.map((a, i) => (
        <div
          key={i}
          className="flex items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] px-3 py-2 text-[var(--text-sm)] text-[var(--muted)]"
        >
          <BarChart3 size={15} className="text-[var(--accent)]" />
          Analyzed {a.sourceName} · {a.rowCount} rows
        </div>
      ))}

      {createdForms.map((f) => (
        <a
          key={f.formId}
          href={f.publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] px-3 py-2 text-[var(--text-sm)] hover:bg-[var(--accent-soft)]"
        >
          <ClipboardList size={15} className="text-[var(--accent)]" />
          <span className="flex-1 truncate">Created form: {f.title}</span>
          <ExternalLink size={13} className="text-[var(--muted)]" />
        </a>
      ))}

      {accessChanges.map((a, i) => (
        <div
          key={i}
          className="flex items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] px-3 py-2 text-[var(--text-sm)] text-[var(--muted)]"
        >
          <ShieldOff size={15} className="text-[var(--accent)]" />
          {a.cleared
            ? `Cleared access restrictions on ${a.sourceName}`
            : `Restricted ${a.restrictedCount} ${a.restrictedCount === 1 ? "person" : "people"} from ${a.sourceName}`}
        </div>
      ))}

      {balance && (
        <div className="flex items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] px-3 py-2 text-[var(--text-sm)]">
          <Wallet size={15} className="text-[var(--accent)]" />
          {balance.nickname}: <span className="font-medium tabular-nums">${balance.balance.toFixed(2)}</span>
        </div>
      )}

      {draftedPayment && (
        <button
          onClick={() => onOpenPayment?.(draftedPayment.paymentId)}
          className="flex items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] px-3 py-2 text-left text-[var(--text-sm)] hover:bg-[var(--accent-soft)]"
        >
          <CircleDollarSign size={15} className="text-[var(--accent)]" />
          Drafted payment: {draftedPayment.vendorName} · ${draftedPayment.amount.toFixed(2)}
        </button>
      )}

      {receivedPayment && (
        <div className="flex items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] px-3 py-2 text-[var(--text-sm)]">
          <ArrowDownToLine size={15} className="text-[var(--success)]" />
          Received from {receivedPayment.fromName}: <span className="font-medium tabular-nums">${receivedPayment.amount.toFixed(2)}</span>
        </div>
      )}

      {emailDraft && (
        <button
          onClick={() => onOpenDraft?.(emailDraft.draftId)}
          className="flex items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] px-3 py-2 text-left text-[var(--text-sm)] hover:bg-[var(--accent-soft)]"
        >
          <Mail size={15} className="text-[var(--accent)]" />
          Drafted email: {emailDraft.subject || "(no subject)"}
        </button>
      )}

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
    </div>
  );
}
