/**
 * Splits text into overlapping word-bounded chunks. Overlap keeps a claim
 * that straddles a chunk boundary from losing its context in one half.
 */
export function chunkText(
  text: string,
  targetSize = 1200,
  overlap = 200,
): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    let end = Math.min(start + targetSize, normalized.length);

    if (end < normalized.length) {
      const lastBreak = normalized.lastIndexOf("\n\n", end);
      if (lastBreak > start + targetSize / 2) {
        end = lastBreak;
      }
    }

    const chunk = normalized.slice(start, end).trim();
    if (chunk) chunks.push(chunk);

    if (end >= normalized.length) break;
    start = end - overlap;
  }

  return chunks;
}
