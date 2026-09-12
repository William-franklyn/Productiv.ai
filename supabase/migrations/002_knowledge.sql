-- Knowledge sources: uploaded documents, chunked and embedded for retrieval.

create extension if not exists "vector";

create table knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  mime_type text not null,
  storage_path text not null,
  status text not null default 'processing' check (status in ('processing', 'ready', 'failed')),
  error text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create index knowledge_sources_organization_id_idx on knowledge_sources (organization_id);

-- text-embedding-3-small produces 1536-dim vectors.
create table knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  source_id uuid not null references knowledge_sources (id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index knowledge_chunks_organization_id_idx on knowledge_chunks (organization_id);
create index knowledge_chunks_source_id_idx on knowledge_chunks (source_id);
create index knowledge_chunks_embedding_idx
  on knowledge_chunks using hnsw (embedding vector_cosine_ops);

alter table knowledge_sources enable row level security;
alter table knowledge_chunks enable row level security;

create policy "members read own organization sources"
  on knowledge_sources for select
  using (organization_id = current_org_id());

create policy "members manage own organization sources"
  on knowledge_sources for all
  using (organization_id = current_org_id())
  with check (organization_id = current_org_id());

create policy "members read own organization chunks"
  on knowledge_chunks for select
  using (organization_id = current_org_id());

-- Chunks are written by the ingest route using the service-role key
-- (embedding happens server-side), so there is no insert policy for the
-- authenticated role — only select, scoped to the caller's tenant.

-- Cosine-similarity search, scoped to the caller's organization by the RLS
-- policy above (SECURITY INVOKER — this runs as the calling user, not a
-- superuser, so tenant isolation is enforced the same way a plain SELECT is).
create function match_knowledge_chunks(
  query_embedding vector(1536),
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
