-- Per-source access restriction: within a workspace, a source is visible to
-- every member by default (existing org-level RLS already keeps outsiders
-- out entirely) — this adds an explicit deny-list on top, so a member can be
-- excluded from a specific source without touching their workspace role.

create table knowledge_source_restrictions (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references knowledge_sources (id) on delete cascade,
  organization_id uuid not null references organizations (id) on delete cascade,
  restricted_user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (source_id, restricted_user_id)
);

create index knowledge_source_restrictions_source_id_idx on knowledge_source_restrictions (source_id);

alter table knowledge_source_restrictions enable row level security;

create policy "members manage own organization source restrictions"
  on knowledge_source_restrictions for all
  using (is_member_of(organization_id))
  with check (is_member_of(organization_id));

create function is_restricted_from(src uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from knowledge_source_restrictions
    where source_id = src and restricted_user_id = auth.uid()
  )
$$;

-- knowledge_sources: split the old single "for all" policy into per-command
-- policies so the restriction check applies to every read path — a single
-- broader "for all" policy would OR together with a narrower select policy
-- and defeat it.
drop policy "members read own organization sources" on knowledge_sources;
drop policy "members manage own organization sources" on knowledge_sources;

create policy "members read own organization sources"
  on knowledge_sources for select
  using (is_member_of(organization_id) and not is_restricted_from(id));

create policy "members insert own organization sources"
  on knowledge_sources for insert
  with check (is_member_of(organization_id));

create policy "members update own organization sources"
  on knowledge_sources for update
  using (is_member_of(organization_id) and not is_restricted_from(id))
  with check (is_member_of(organization_id));

create policy "members delete own organization sources"
  on knowledge_sources for delete
  using (is_member_of(organization_id) and not is_restricted_from(id));

-- knowledge_chunks: same restriction, keyed off the parent source.
drop policy "members read own organization chunks" on knowledge_chunks;

create policy "members read own organization chunks"
  on knowledge_chunks for select
  using (is_member_of(organization_id) and not is_restricted_from(source_id));

-- storage.objects: the raw file bytes get the same treatment. Path shape is
-- `{organization_id}/{source_id}/{filename}`, so foldername[2] is the source.
do $$
begin
  drop policy "members read own organization files" on storage.objects;
  create policy "members read own organization files"
    on storage.objects for select
    using (
      bucket_id = 'knowledge'
      and is_member_of((storage.foldername(name))[1]::uuid)
      and not is_restricted_from((storage.foldername(name))[2]::uuid)
    );
exception when others then
  raise notice 'skipping storage select policy update: %', sqlerrm;
end $$;
