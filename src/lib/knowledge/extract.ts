import "server-only";
import { generateText } from "ai";
import { geminiModel } from "@/lib/ai/provider";

const TEXT_MIME_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
]);

// Below this, unpdf's result is treated as "no real text layer" rather than
// "a very short document" — a scanned page can still yield a few stray
// characters from page furniture (numbers, headers) without any real content.
const MIN_TEXT_LAYER_CHARS = 20;

/**
 * Gemini reads the PDF's page images directly, so it works on scanned or
 * photographed documents unpdf's text-layer extraction can't touch — the
 * exact kind of paper record this product exists to get off paper. Optional:
 * without GEMINI_API_KEY, a scanned PDF just extracts to empty text like it
 * always did.
 */
async function extractPdfWithGemini(buffer: Buffer): Promise<string | null> {
  if (!process.env.GEMINI_API_KEY) return null;

  try {
    const result = await generateText({
      model: geminiModel,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Transcribe every word of readable text in this document, page by page, including scanned, photographed, or handwritten pages. Output only the transcribed text — no commentary, no summary.",
            },
            { type: "file", data: buffer, mediaType: "application/pdf" },
          ],
        },
      ],
    });
    return result.text.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Best-effort text extraction for a knowledge source. Text-ish formats are
 * decoded directly; PDF goes through unpdf, falling back to Gemini's
 * multimodal reading when the PDF has no real text layer.
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

    if (text.trim().length >= MIN_TEXT_LAYER_CHARS) return text;

    const geminiText = await extractPdfWithGemini(buffer);
    return geminiText ?? text;
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}

export const SUPPORTED_MIME_TYPES = [...TEXT_MIME_TYPES, "application/pdf"];
