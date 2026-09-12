const TEXT_MIME_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
]);

/**
 * Best-effort text extraction for a knowledge source. Text-ish formats are
 * decoded directly; PDF goes through unpdf. Anything else is rejected at the
 * upload route before this runs.
 */
export async function extractText(
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  if (TEXT_MIME_TYPES.has(mimeType)) {
    return buffer.toString("utf-8");
  }

  if (mimeType === "application/pdf") {
    const { extractText: extractPdfText, getDocumentProxy } = await import(
      "unpdf"
    );
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractPdfText(pdf, { mergePages: true });
    return text;
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}

export const SUPPORTED_MIME_TYPES = [...TEXT_MIME_TYPES, "application/pdf"];
