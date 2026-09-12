import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractText } from "./extract";
import { chunkText } from "./chunk";
import { embedTexts } from "./embed";

/**
 * Extracts, chunks, and embeds a just-uploaded source, then flips its status
 * to ready/failed. Runs inline in the request that created the source — a
 * 201 from the upload route means the document is already askable.
 */
export async function ingestSource(params: {
  sourceId: string;
  organizationId: string;
  buffer: Buffer;
  mimeType: string;
}) {
  const { sourceId, organizationId, buffer, mimeType } = params;
  const admin = createAdminClient();

  try {
    const text = await extractText(buffer, mimeType);
    const chunks = chunkText(text);

    if (chunks.length === 0) {
      await admin
        .from("knowledge_sources")
        .update({ status: "failed", error: "No extractable text found" })
        .eq("id", sourceId);
      return;
    }

    const embeddings = await embedTexts(chunks);

    const rows = chunks.map((content, i) => ({
      organization_id: organizationId,
      source_id: sourceId,
      chunk_index: i,
      content,
      embedding: embeddings[i],
    }));

    const { error: insertError } = await admin
      .from("knowledge_chunks")
      .insert(rows);
    if (insertError) throw insertError;

    await admin
      .from("knowledge_sources")
      .update({ status: "ready" })
      .eq("id", sourceId);
  } catch (err) {
    await admin
      .from("knowledge_sources")
      .update({
        status: "failed",
        error: err instanceof Error ? err.message : "Ingestion failed",
      })
      .eq("id", sourceId);
  }
}
