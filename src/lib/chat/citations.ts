export interface CitedChunk {
  sourceId: string;
  sourceName: string;
  content: string;
}

export type Segment =
  | { type: "text"; text: string }
  | { type: "citation"; n: number; chunk: CitedChunk | null };

/**
 * Splits model output on inline `[1]`-style markers into text and citation
 * segments. Marker numbers are 1-indexed into `chunks`, matching the order
 * search_knowledge returned them in — that's the contract given to the model
 * in the system prompt.
 */
export function splitCitations(text: string, chunks: CitedChunk[]): Segment[] {
  const segments: Segment[] = [];
  const pattern = /\[(\d+)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", text: text.slice(lastIndex, match.index) });
    }
    const n = parseInt(match[1], 10);
    segments.push({ type: "citation", n, chunk: chunks[n - 1] ?? null });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", text: text.slice(lastIndex) });
  }

  return segments;
}
