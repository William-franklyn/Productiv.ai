-- Bug found by live testing: match_knowledge_chunks bakes in
-- `is_member_of(org_id)`, which reads auth.uid() — NULL on a service-role
-- connection, so calling it via the admin client (as the "would this
-- sensitive source have matched" audit check in
-- src/lib/knowledge/retrieval.ts does) always returned zero rows,
-- regardless of org_id. Denied-access audit logging silently never fired.
--
-- This function is the fix: same vector search, no is_member_of gate, but
-- locked to service_role only (see revoke/grant below) so it can't be used
-- as a bypass by a regular authenticated user calling it directly — the
-- thing match_knowledge_chunks's own gate exists to prevent.
create function match_knowledge_chunks_unfiltered(
  query_embedding vector(1024),
  org_id uuid,
  match_count int default 20
)
returns table (source_id uuid, similarity float)
language sql
stable
security definer
set search_path = public
as $$
  select
    knowledge_chunks.source_id,
    1 - (knowledge_chunks.embedding <=> query_embedding) as similarity
  from knowledge_chunks
  where knowledge_chunks.organization_id = org_id
  order by knowledge_chunks.embedding <=> query_embedding
  limit match_count
$$;

revoke all on function match_knowledge_chunks_unfiltered(vector, uuid, int) from public, anon, authenticated;
grant execute on function match_knowledge_chunks_unfiltered(vector, uuid, int) to service_role;
