import type { CitedChunk } from "@/lib/chat/citations";

export function CitationMarker({
  n,
  chunk,
  onOpen,
}: {
  n: number;
  chunk: CitedChunk | null;
  onOpen: () => void;
}) {
  if (!chunk) {
    return <sup className="text-[var(--muted)]">[{n}]</sup>;
  }

  return (
    <span className="group relative">
      <button
        onClick={onOpen}
        className="mx-0.5 inline-flex h-4 min-w-4 -translate-y-1 items-center justify-center rounded-full bg-[var(--accent-soft)] px-1 text-[10px] font-medium text-[var(--accent)] align-super hover:bg-[var(--accent)] hover:text-[var(--accent-ink)]"
      >
        {n}
      </button>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 w-64 -translate-x-1/2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-left text-[var(--text-xs)] opacity-0 shadow-[var(--shadow-menu)] transition-opacity group-hover:opacity-100">
        <p className="font-medium">{chunk.sourceName}</p>
        <p className="mt-1 line-clamp-3 text-[var(--muted)]">{chunk.content}</p>
      </span>
    </span>
  );
}
