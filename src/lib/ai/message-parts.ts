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
  const tasks: { title: string }[] = [];
  for (const part of message.parts) {
    if (part.type !== "tool-create_task" || !isOutputAvailable(part)) continue;
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
  };
  for (const part of message.parts) {
    if (part.type in labels && !isOutputAvailable(part)) {
      return labels[part.type];
    }
  }
  return null;
}
