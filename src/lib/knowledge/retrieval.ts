import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { embedQuery } from "./embed";

export interface RetrievedChunk {
  sourceId: string;
  sourceName: string;
  content: string;
  similarity: number;
}

interface MatchRow {
  id: string;
  source_id: string;
  content: string;
  similarity: number;
}

const SENSITIVE_MATCH_THRESHOLD = 0.5;

/**
 * Verified-access audit log (see docs/verified-access.md). RLS already
 * silently drops chunks from a requires_verification source the caller
 * isn't cleared for, so a denial has to be checked and logged explicitly —
 * it can't be inferred from the (already-filtered) results the caller got
 * back. Re-runs the same embedding through match_knowledge_chunks_unfiltered
 * (service-role only — match_knowledge_chunks itself bakes in
 * is_member_of(org_id), which reads auth.uid() and is always false on a
 * service-role connection, so it can't be reused here) to tell "genuinely
 * irrelevant query" apart from "this would have matched, but was denied."
 */
async function logSensitiveAccess(
  orgId: string,
  userId: string,
  query: string,
  embedding: number[],
  matches: MatchRow[],
): Promise<void> {
  const admin = createAdminClient();

  const { data: sensitiveSources } = await admin
    .from("knowledge_sources")
    .select("id")
    .eq("organization_id", orgId)
    .eq("requires_verification", true);
  if (!sensitiveSources || sensitiveSources.length === 0) return;

  const sensitiveIds = new Set(sensitiveSources.map((s) => s.id as string));
  const allowed = [...new Set(matches.filter((m) => sensitiveIds.has(m.source_id)).map((m) => m.source_id))];

  if (allowed.length > 0) {
    await admin.from("access_audit_log").insert(
      allowed.map((sourceId) => ({
        organization_id: orgId,
        user_id: userId,
        source_id: sourceId,
        decision: "allowed" as const,
        query,
      })),
    );
    return;
  }

  const { data: unfiltered } = await admin.rpc("match_knowledge_chunks_unfiltered", {
    query_embedding: embedding,
    org_id: orgId,
    match_count: 20,
  });

  const wouldHaveMatched = ((unfiltered ?? []) as { source_id: string; similarity: number }[]).filter(
    (m) => sensitiveIds.has(m.source_id) && m.similarity >= SENSITIVE_MATCH_THRESHOLD,
  );
  const denied = [...new Set(wouldHaveMatched.map((m) => m.source_id))];

  if (denied.length > 0) {
    await admin.from("access_audit_log").insert(
      denied.map((sourceId) => ({
        organization_id: orgId,
        user_id: userId,
        source_id: sourceId,
        decision: "denied" as const,
        query,
      })),
    );
  }
}

/**
 * Runs the query through `match_knowledge_chunks`. The function checks
 * `is_member_of(org_id)` internally and must be called with the caller's own
 * session client (RLS-scoped), never the admin client, or that check runs as
 * the wrong principal. `orgId` is the *active* workspace — required
 * explicitly now that a user can belong to more than one.
 */
export async function searchKnowledge(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  query: string,
  matchCount = 8,
): Promise<RetrievedChunk[]> {
  const embedding = await embedQuery(query);

  const { data, error } = await supabase.rpc("match_knowledge_chunks", {
    query_embedding: embedding,
    org_id: orgId,
    match_count: matchCount,
  });
  if (error) throw error;

  const matches = (data ?? []) as MatchRow[];

  await logSensitiveAccess(orgId, userId, query, embedding, matches).catch(() => {
    // Audit logging must never break the actual search.
  });

  if (matches.length === 0) return [];

  const sourceIds = [...new Set(matches.map((m) => m.source_id as string))];
  const { data: sources } = await supabase
    .from("knowledge_sources")
    .select("id, name")
    .in("id", sourceIds);

  const nameById = new Map((sources ?? []).map((s) => [s.id, s.name]));

  return matches.map((m) => ({
    sourceId: m.source_id,
    sourceName: nameById.get(m.source_id) ?? "Unknown source",
    content: m.content,
    similarity: m.similarity,
  }));
}
