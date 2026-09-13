import type { UIMessage } from "ai";
import type { ChartSpec } from "@/lib/charts/types";

export interface Citation {
  sourceId: string;
  sourceName: string;
}

type AnyPart = UIMessage["parts"][number];

function isOutputAvailable(part: AnyPart): part is AnyPart & {
  state: "output-available";
  output: unknown;
} {
  return "state" in part && part.state === "output-available";
}

export function getCitations(message: UIMessage): Citation[] {
  const citations: Citation[] = [];
  const seen = new Set<string>();

  for (const part of message.parts) {
    if (part.type !== "tool-search_knowledge" || !isOutputAvailable(part)) continue;
    const output = part.output as
      | { found: true; chunks: Citation[] }
      | { found: false };
    if (!output.found) continue;

    for (const chunk of output.chunks) {
      if (!seen.has(chunk.sourceId)) {
        seen.add(chunk.sourceId);
        citations.push({ sourceId: chunk.sourceId, sourceName: chunk.sourceName });
      }
    }
  }
  return citations;
}

export interface CitedChunk extends Citation {
  content: string;
}

/**
 * The ordered chunk list from the most recent search_knowledge call in this
 * message — order matters here, since it's what inline [1]/[2] markers in
 * the model's text index into.
 */
export function getOrderedChunks(message: UIMessage): CitedChunk[] {
  let latest: CitedChunk[] = [];
  for (const part of message.parts) {
    if (part.type !== "tool-search_knowledge" || !isOutputAvailable(part)) continue;
    const output = part.output as
      | { found: true; chunks: CitedChunk[] }
      | { found: false };
    if (output.found) latest = output.chunks;
  }
  return latest;
}

export function getChart(message: UIMessage): ChartSpec | null {
  for (const part of message.parts) {
    if (part.type === "tool-generate_chart" && isOutputAvailable(part)) {
      return part.output as ChartSpec;
    }
  }
  return null;
}

export function getCreatedTasks(message: UIMessage) {
  const tasks: { title: string; assigneeName: string | null }[] = [];
  for (const part of message.parts) {
    if (part.type !== "tool-create_task" || !isOutputAvailable(part)) continue;
    const output = part.output as { ok: boolean; title?: string; assigneeName?: string | null };
    if (output.ok && output.title) {
      tasks.push({ title: output.title, assigneeName: output.assigneeName ?? null });
    }
  }
  return tasks;
}

export function getCompletedTasks(message: UIMessage) {
  const tasks: { title: string }[] = [];
  for (const part of message.parts) {
    if (part.type !== "tool-complete_task" || !isOutputAvailable(part)) continue;
    const output = part.output as { ok: boolean; title?: string };
    if (output.ok && output.title) tasks.push({ title: output.title });
  }
  return tasks;
}

export function getScheduledMeetings(message: UIMessage) {
  const meetings: { title: string; startsAt: string; attendeeEmail?: string; emailSent?: boolean }[] = [];
  for (const part of message.parts) {
    if (part.type !== "tool-schedule_meeting" || !isOutputAvailable(part)) continue;
    const output = part.output as {
      ok: boolean;
      title?: string;
      startsAt?: string;
      attendeeEmail?: string;
      emailSent?: boolean;
    };
    if (output.ok && output.title && output.startsAt) {
      meetings.push({
        title: output.title,
        startsAt: output.startsAt,
        attendeeEmail: output.attendeeEmail,
        emailSent: output.emailSent,
      });
    }
  }
  return meetings;
}

export function getCancelledMeetings(message: UIMessage) {
  const meetings: { title: string }[] = [];
  for (const part of message.parts) {
    if (part.type !== "tool-cancel_meeting" || !isOutputAvailable(part)) continue;
    const output = part.output as { ok: boolean; title?: string };
    if (output.ok && output.title) meetings.push({ title: output.title });
  }
  return meetings;
}

export interface DraftedEmail {
  draftId: string;
  to: string;
  subject: string;
}

/**
 * The most recent draft_email call in this message — a message could in
 * principle draft more than one, but the review panel only ever shows one
 * at a time, so last-one-wins matches what the user sees happen.
 */
export function getEmailDraft(message: UIMessage): DraftedEmail | null {
  let latest: DraftedEmail | null = null;
  for (const part of message.parts) {
    if (part.type !== "tool-draft_email" || !isOutputAvailable(part)) continue;
    const output = part.output as { ok: boolean; draftId?: string; to?: string; subject?: string };
    if (output.ok && output.draftId) {
      latest = { draftId: output.draftId, to: output.to ?? "", subject: output.subject ?? "" };
    }
  }
  return latest;
}

export function getDataAnalysis(message: UIMessage) {
  const analyses: { sourceName: string; rowCount: number }[] = [];
  for (const part of message.parts) {
    if (part.type !== "tool-analyze_data" || !isOutputAvailable(part)) continue;
    const output = part.output as { ok: boolean; sourceName?: string; rowCount?: number };
    if (output.ok && output.sourceName && output.rowCount !== undefined) {
      analyses.push({ sourceName: output.sourceName, rowCount: output.rowCount });
    }
  }
  return analyses;
}

export function getAccessChanges(message: UIMessage) {
  const changes: { sourceName: string; restrictedCount?: number; cleared?: boolean }[] = [];
  for (const part of message.parts) {
    if (part.type !== "tool-restrict_source_access" || !isOutputAvailable(part)) continue;
    const output = part.output as {
      ok: boolean;
      sourceName?: string;
      restrictedCount?: number;
      cleared?: boolean;
    };
    if (output.ok && output.sourceName) {
      changes.push({
        sourceName: output.sourceName,
        restrictedCount: output.restrictedCount,
        cleared: output.cleared,
      });
    }
  }
  return changes;
}

export function getCreatedForms(message: UIMessage) {
  const forms: { formId: string; title: string; publicUrl: string; published: boolean }[] = [];
  for (const part of message.parts) {
    if (part.type !== "tool-create_form" || !isOutputAvailable(part)) continue;
    const output = part.output as {
      ok: boolean;
      formId?: string;
      title?: string;
      publicUrl?: string;
      published?: boolean;
    };
    if (output.ok && output.formId && output.title && output.publicUrl) {
      forms.push({
        formId: output.formId,
        title: output.title,
        publicUrl: output.publicUrl,
        published: output.published ?? true,
      });
    }
  }
  return forms;
}

export function getAccountBalance(message: UIMessage) {
  for (const part of message.parts) {
    if (part.type !== "tool-get_account_balance" || !isOutputAvailable(part)) continue;
    const output = part.output as { ok: boolean; nickname?: string; balance?: number };
    if (output.ok && output.balance !== undefined) {
      return { nickname: output.nickname ?? "Account", balance: output.balance };
    }
  }
  return null;
}

export interface DraftedPayment {
  paymentId: string;
  vendorName: string;
  amount: number;
}

export function getDraftedPayment(message: UIMessage): DraftedPayment | null {
  let latest: DraftedPayment | null = null;
  for (const part of message.parts) {
    if (part.type !== "tool-pay_vendor" || !isOutputAvailable(part)) continue;
    const output = part.output as { ok: boolean; paymentId?: string; vendorName?: string; amount?: number };
    if (output.ok && output.paymentId) {
      latest = { paymentId: output.paymentId, vendorName: output.vendorName ?? "", amount: output.amount ?? 0 };
    }
  }
  return latest;
}

export interface ReceivedPayment {
  fromName: string;
  amount: number;
}

export function getReceivedPayment(message: UIMessage): ReceivedPayment | null {
  for (const part of message.parts) {
    if (part.type !== "tool-receive_payment" || !isOutputAvailable(part)) continue;
    const output = part.output as { ok: boolean; fromName?: string; amount?: number };
    if (output.ok && output.fromName) {
      return { fromName: output.fromName, amount: output.amount ?? 0 };
    }
  }
  return null;
}

/**
 * Sponsored-credits usage classification: a "refusal" is specifically a
 * knowledge question that came back empty (search_knowledge found nothing)
 * with nothing else in the turn that actually succeeded — that's the "your
 * teacher hasn't covered this" case, which is free. Everything else,
 * including plain conversation with no tool calls at all, counts as answered.
 */
export function classifyUsage(message: UIMessage): "answered" | "refused" {
  let sawEmptySearch = false;
  let sawSuccess = false;

  for (const part of message.parts) {
    if (!isOutputAvailable(part) || !part.type.startsWith("tool-")) continue;
    if (part.type === "tool-search_knowledge") {
      const output = part.output as { found: boolean };
      if (output.found) sawSuccess = true;
      else sawEmptySearch = true;
    } else {
      const output = part.output as { ok?: boolean };
      if (output.ok !== false) sawSuccess = true;
    }
  }

  return sawEmptySearch && !sawSuccess ? "refused" : "answered";
}

export function getText(message: UIMessage): string {
  return message.parts
    .filter((p): p is Extract<AnyPart, { type: "text" }> => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export function isToolPending(message: UIMessage): string | null {
  const labels: Record<string, string> = {
    "tool-search_knowledge": "Searching knowledge…",
    "tool-generate_chart": "Building chart…",
    "tool-create_task": "Creating task…",
    "tool-schedule_meeting": "Scheduling meeting…",
    "tool-list_meetings": "Checking the calendar…",
    "tool-cancel_meeting": "Cancelling meeting…",
    "tool-draft_email": "Drafting email…",
    "tool-analyze_data": "Crunching numbers…",
    "tool-restrict_source_access": "Updating access…",
    "tool-create_form": "Building form…",
    "tool-list_form_responses": "Fetching responses…",
    "tool-list_tasks": "Checking tasks…",
    "tool-complete_task": "Marking task done…",
    "tool-get_account_balance": "Checking balance…",
    "tool-list_transactions": "Fetching transactions…",
    "tool-analyze_spending": "Analyzing spending…",
    "tool-pay_vendor": "Drafting payment…",
    "tool-receive_payment": "Recording payment…",
    "tool-get_receipt": "Looking up transaction…",
  };
  for (const part of message.parts) {
    if (part.type in labels && !isOutputAvailable(part)) {
      return labels[part.type];
    }
  }
  return null;
}
