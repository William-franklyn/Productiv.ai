import { splitCitations, type CitedChunk } from "@/lib/chat/citations";
import { ConfidenceBadge } from "@/components/assistant/ConfidenceBadge";

export interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  chunks: CitedChunk[];
}

export function ChatMessageRow({
  message,
  onCiteClick,
}: {
  message: DisplayMessage;
  onCiteClick: (n: number) => void;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-[var(--radius-lg)] bg-[var(--accent-soft)] px-4 py-2.5 text-[var(--text-base)]">
          {message.text}
        </div>
      </div>
    );
  }

  const segments = splitCitations(message.text, message.chunks);
  const citedCount = new Set(
    segments.filter((s) => s.type === "citation" && s.chunk).map((s) => (s as { n: number }).n),
  ).size;

  return (
    <div className="flex flex-col gap-2">
      <p className="whitespace-pre-wrap text-[var(--text-base)] leading-relaxed">
        {segments.map((seg, i) =>
          seg.type === "text" ? (
            <span key={i}>{seg.text}</span>
          ) : (
            <sup
              key={i}
              role="button"
              onClick={() => onCiteClick(seg.n)}
              className="mx-0.5 cursor-pointer rounded bg-[var(--accent-soft)] px-1 text-[10px] font-medium text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-ink)]"
            >
              {seg.n}
            </sup>
          ),
        )}
      </p>
      {citedCount > 0 && <ConfidenceBadge sourceCount={citedCount} />}
    </div>
  );
}
