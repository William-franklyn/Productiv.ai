-- Switch the embedding provider from OpenAI (1536-dim) to Voyage (1024-dim).
-- Safe as a plain column-type change here because no chunks have been
-- embedded yet in a fresh project; a project with existing OpenAI-embedded
-- chunks would need those re-embedded, not just the column retyped.

drop function if exists match_knowledge_chunks(vector(1536), int);
drop index if exists knowledge_chunks_embedding_idx;

alter table knowledge_chunks
  alter column embedding type vector(1024);

create index knowledge_chunks_embedding_idx
  on knowledge_chunks using hnsw (embedding vector_cosine_ops);

create function match_knowledge_chunks(
  query_embedding vector(1024),
  match_count int default 8
)
returns table (
  id uuid,
  source_id uuid,
  content text,
  similarity float
)
language sql
stable
as $$
  select
    knowledge_chunks.id,
    knowledge_chunks.source_id,
    knowledge_chunks.content,
    1 - (knowledge_chunks.embedding <=> query_embedding) as similarity
  from knowledge_chunks
  where knowledge_chunks.organization_id = current_org_id()
  order by knowledge_chunks.embedding <=> query_embedding
  limit match_count
$$;
