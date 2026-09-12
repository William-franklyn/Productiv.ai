import type { SupabaseClient } from "@supabase/supabase-js";
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
