-- Multi-workspace membership. Previously a profile carried exactly one
-- organization_id and one role — this splits that into a memberships table
-- so one person can belong to several workspaces, each with its own role.
--
-- RLS design change that comes with it: policies used to compare
-- organization_id to current_org_id() (a single value read off the caller's
-- profile row) — a user could only ever match rows in the one org they
-- belonged to. With multiple memberships that equality check is gone;
-- policies now check *membership* (is_member_of(organization_id)), which is
-- broader by design. The narrowing to "just the workspace you're currently
-- looking at" moves to the application layer — every route now filters
-- explicitly by the active organization_id instead of relying on RLS to do
-- it implicitly. RLS's job here is the security boundary (can you touch this
-- org at all), not workspace selection.

create table memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  organization_id uuid not null references organizations (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (user_id, organization_id)
);

create index memberships_user_id_idx on memberships (user_id);
create index memberships_organization_id_idx on memberships (organization_id);

insert into memberships (user_id, organization_id, role, created_at)
select id, organization_id, role, created_at from profiles;

alter table memberships enable row level security;

create function is_member_of(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from memberships where organization_id = org and user_id = auth.uid()
  )
$$;

create function member_role(org uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from memberships where organization_id = org and user_id = auth.uid()
$$;

create policy "users read own memberships"
  on memberships for select
  using (user_id = auth.uid());

-- Memberships are written server-side with the service-role key (creating a
-- workspace, redeeming an invite) — no insert/update/delete policy for the
-- authenticated role, same reasoning as organizations/profiles in 001.

-- ============================================================================
-- organizations
-- ============================================================================

drop policy "members read own organization" on organizations;

create policy "members read own organizations"
  on organizations for select
  using (is_member_of(id));

-- ============================================================================
-- profiles — no longer org-scoped; drop the columns memberships replaces.
-- ============================================================================

drop policy "members read profiles in own organization" on profiles;
drop policy "members update own profile" on profiles;

alter table profiles drop column organization_id;
alter table profiles drop column role;

create policy "users read profiles sharing a workspace"
  on profiles for select
  using (
    exists (
      select 1 from memberships mine
      join memberships theirs on theirs.organization_id = mine.organization_id
      where mine.user_id = auth.uid() and theirs.user_id = profiles.id
    )
  );

create policy "users update own profile"
  on profiles for update
  using (id = auth.uid());

-- ============================================================================
-- org_invites
-- ============================================================================

alter table org_invites add column message text;

drop policy "members read own organization invites" on org_invites;
drop policy "members create invites for own organization" on org_invites;

create policy "members read own organization invites"
  on org_invites for select
  using (is_member_of(organization_id));

create policy "members create invites for own organization"
  on org_invites for insert
  with check (is_member_of(organization_id));

-- ============================================================================
-- knowledge_sources / knowledge_chunks
-- ============================================================================

drop policy "members read own organization sources" on knowledge_sources;
drop policy "members manage own organization sources" on knowledge_sources;
drop policy "members read own organization chunks" on knowledge_chunks;

create policy "members read own organization sources"
  on knowledge_sources for select
  using (is_member_of(organization_id));

create policy "members manage own organization sources"
  on knowledge_sources for all
  using (is_member_of(organization_id))
  with check (is_member_of(organization_id));

create policy "members read own organization chunks"
  on knowledge_chunks for select
  using (is_member_of(organization_id));

-- match_knowledge_chunks now takes the active org explicitly instead of
-- reading current_org_id() — the caller must be a member of it (checked
-- below), same security boundary, just no longer assuming a single org.
drop function if exists match_knowledge_chunks(vector(1024), int);

create function match_knowledge_chunks(
  query_embedding vector(1024),
  org_id uuid,
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
  where knowledge_chunks.organization_id = org_id
    and is_member_of(org_id)
  order by knowledge_chunks.embedding <=> query_embedding
  limit match_count
$$;

-- ============================================================================
-- storage.objects (knowledge bucket)
-- ============================================================================

do $$
begin
  drop policy "members read own organization files" on storage.objects;
  create policy "members read own organization files"
    on storage.objects for select
    using (
      bucket_id = 'knowledge'
      and is_member_of((storage.foldername(name))[1]::uuid)
    );
exception when others then
  raise notice 'skipping storage select policy update: %', sqlerrm;
end $$;

do $$
begin
  drop policy "members upload to own organization folder" on storage.objects;
  create policy "members upload to own organization folder"
    on storage.objects for insert
    with check (
      bucket_id = 'knowledge'
      and is_member_of((storage.foldername(name))[1]::uuid)
    );
exception when others then
  raise notice 'skipping storage insert policy update: %', sqlerrm;
end $$;

-- ============================================================================
-- conversations / messages — still per-user; membership check replaces the
-- old org equality.
-- ============================================================================

drop policy "users manage own conversations" on conversations;

create policy "users manage own conversations"
  on conversations for all
  using (user_id = auth.uid() and is_member_of(organization_id))
  with check (user_id = auth.uid() and is_member_of(organization_id));

-- messages' policy already goes through a conversations subquery keyed on
-- user_id, not organization_id directly — nothing to change there.

-- ============================================================================
-- tasks
-- ============================================================================

drop policy "members manage own organization tasks" on tasks;

create policy "members manage own organization tasks"
  on tasks for all
  using (is_member_of(organization_id))
  with check (is_member_of(organization_id));

-- ============================================================================
-- usage_daily — increment_usage() now takes the active org explicitly.
-- ============================================================================

drop function if exists increment_usage(int);

create function increment_usage(org_id uuid, daily_limit int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count int;
begin
  if not is_member_of(org_id) then
    raise exception 'not_a_member' using errcode = 'P0001';
  end if;

  insert into usage_daily (organization_id, user_id, day, requests)
  values (org_id, auth.uid(), current_date, 1)
  on conflict (user_id, day)
  do update set requests = usage_daily.requests + 1
  returning requests into current_count;

  if current_count > daily_limit then
    raise exception 'daily_limit_exceeded' using errcode = 'P0001';
  end if;

  return current_count;
end;
$$;

-- ============================================================================
-- activity_log
-- ============================================================================

drop policy "members read own organization activity" on activity_log;
drop policy "members write own organization activity" on activity_log;

create policy "members read own organization activity"
  on activity_log for select
  using (is_member_of(organization_id));

create policy "members write own organization activity"
  on activity_log for insert
  with check (is_member_of(organization_id));

-- ============================================================================
-- meetings
-- ============================================================================

drop policy "members manage own organization meetings" on meetings;

create policy "members manage own organization meetings"
  on meetings for all
  using (is_member_of(organization_id))
  with check (is_member_of(organization_id));

-- current_org_id() is no longer referenced anywhere — every policy and
-- function above now takes an explicit org_id (from the app's active-
-- workspace selection) instead of assuming a single org per user.
drop function if exists current_org_id();
