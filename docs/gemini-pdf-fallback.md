# Gemini fallback for scanned PDFs

Knowledge-source PDF text extraction (`src/lib/knowledge/extract.ts`) uses
`unpdf`, which reads a PDF's text layer — the actual embedded characters a
PDF viewer can select and copy. That's the wrong tool for a **scanned or
photographed page**: the "text" there is pixels in an image, with no text
layer to read at all. `unpdf` returns empty text for those, which used to
mean the upload just failed with "No extractable text found."

That's a real gap for this product specifically — paper records are exactly
what an under-resourced organization is trying to get *off* of, and a
scanned form or handwritten field report is a completely normal thing for
one to upload.

## How it works

If `unpdf`'s result is under 20 characters (a real text layer for an actual
page of content is never that short — this threshold is just distinguishing
"no text layer" from "a real one"), `extractText` falls back to Gemini
(`gemini-3.6-flash`), sending it the raw PDF bytes and asking it to
transcribe every page, including scanned or handwritten ones. Gemini reads
the page images directly, the same way a person would.

## Why this model id

`gemini-2.5-flash` returns `404 — This model ... is no longer available to
new users` as of this build; the API's own error message pointed at
`gemini-3.6-flash`, which was verified directly against the API before
wiring it in here.

## Verifying it works

Confirmed end-to-end with a hand-built PDF: a JPEG image (rendered from an
SVG containing a specific sentence) embedded as the page content with **zero
text operators** anywhere in the PDF — as close to a real scanned document
as a synthetic test gets. `unpdf` correctly returned empty text for it;
`extractText` correctly fell through to Gemini, which correctly transcribed
the sentence that existed only in the image, never in any text layer.

## Env

`GEMINI_API_KEY` — optional. `@ai-sdk/google` defaults to reading
`GOOGLE_GENERATIVE_AI_API_KEY`; `src/lib/ai/provider.ts` explicitly
configures it with `GEMINI_API_KEY` instead, for consistency with every
other provider key in this codebase. Without it, a scanned PDF just extracts
to empty text and fails ingestion exactly like it did before this existed.
