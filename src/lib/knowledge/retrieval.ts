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
 * Runs the query through `match_knowledge_chunks`, which is SECURITY INVOKER
 * and scopes to `current_org_id()` inside the SQL itself — so this must be
 * called with the caller's own session client (RLS-scoped), never the
 * admin client, or the permission boundary silently disappears.
 */
export async function searchKnowledge(
  supabase: SupabaseClient,
  query: string,
  matchCount = 8,
): Promise<RetrievedChunk[]> {
  const embedding = await embedQuery(query);

  const { data, error } = await supabase.rpc("match_knowledge_chunks", {
    query_embedding: embedding,
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
