-- ProductivAI — full database schema
--
-- This is the numbered migrations in supabase/migrations/ concatenated into
-- one script, in order, for standing up a brand-new Supabase project in a
-- single run. It is generated from those files, not hand-maintained — if you
-- change the schema, add a new numbered migration and regenerate this file
-- rather than editing it directly.
--
-- Run this in the SQL editor of a fresh Supabase project. Do not run it
-- against a project that already has these tables.

-- ============================================================================
-- 001_orgs_and_profiles.sql
-- Organizations and profiles: the multi-tenant foundation.
-- Every other table in this app carries an organization_id and is scoped by
-- the same RLS pattern established here.
-- ============================================================================

create extension if not exists "pgcrypto";

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid not null references organizations (id) on delete cascade,
  full_name text,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now()
);

create index profiles_organization_id_idx on profiles (organization_id);

-- Returns the caller's organization. SECURITY DEFINER so it can read
-- `profiles` on the caller's behalf without recursing into this table's own
-- RLS policy (which itself calls this function).
create function current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from profiles where id = auth.uid()
$$;

alter table organizations enable row level security;
alter table profiles enable row level security;

create policy "members read own organization"
  on organizations for select
  using (id = current_org_id());

create policy "members read profiles in own organization"
  on profiles for select
  using (organization_id = current_org_id());

create policy "members update own profile"
  on profiles for update
  using (id = auth.uid())
  with check (organization_id = current_org_id());

-- Organization and profile creation happens server-side via the service-role
-- key during signup (see src/app/api/auth/bootstrap/route.ts) — there is
-- deliberately no insert policy for the authenticated role here.

create table org_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  email text not null,
  token text not null unique,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  redeemed_at timestamptz
);

alter table org_invites enable row level security;

create policy "members read own organization invites"
  on org_invites for select
  using (organization_id = current_org_id());

create policy "members create invites for own organization"
  on org_invites for insert
  with check (organization_id = current_org_id());

-- ============================================================================
-- 002_knowledge.sql
-- Knowledge sources: uploaded documents, chunked and embedded for retrieval.
-- ============================================================================

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

-- ============================================================================
-- 003_knowledge_storage.sql
-- Storage bucket for uploaded knowledge files, path-scoped per tenant:
-- objects live at "{organization_id}/{source_id}/{filename}".
--
-- Policies on storage.objects require the supabase_storage_admin role. In the
-- Supabase SQL editor the whole file runs as one transaction, so if this part
-- fails on a permissions error it would otherwise roll back everything above
-- it too, silently. Wrapping it lets it fail alone.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('knowledge', 'knowledge', false)
on conflict (id) do nothing;

do $$
begin
  create policy "members read own organization files"
    on storage.objects for select
    using (
      bucket_id = 'knowledge'
      and (storage.foldername(name))[1] = current_org_id()::text
    );
exception when others then
  raise notice 'skipping storage select policy (may already exist or need supabase_storage_admin): %', sqlerrm;
end $$;

do $$
begin
  create policy "members upload to own organization folder"
    on storage.objects for insert
    with check (
      bucket_id = 'knowledge'
      and (storage.foldername(name))[1] = current_org_id()::text
    );
exception when others then
  raise notice 'skipping storage insert policy (may already exist or need supabase_storage_admin): %', sqlerrm;
end $$;

-- ============================================================================
-- 004_chat_and_tasks.sql
-- Assistant conversations and the tasks the assistant can create on a user's
-- behalf.
-- ============================================================================

create table conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  citations jsonb not null default '[]',
  chart jsonb,
  created_at timestamptz not null default now()
);

create index conversations_user_id_idx on conversations (user_id);
create index messages_conversation_id_idx on messages (conversation_id);

alter table conversations enable row level security;
alter table messages enable row level security;

-- Conversations are personal — visible only to the user who started them,
-- not the whole organization.
create policy "users manage own conversations"
  on conversations for all
  using (user_id = auth.uid() and organization_id = current_org_id())
  with check (user_id = auth.uid() and organization_id = current_org_id());

create policy "users manage messages in own conversations"
  on messages for all
  using (
    conversation_id in (select id from conversations where user_id = auth.uid())
  )
  with check (
    conversation_id in (select id from conversations where user_id = auth.uid())
  );

create table tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  created_by uuid references profiles (id),
  title text not null,
  status text not null default 'open' check (status in ('open', 'done')),
  due_date date,
  created_at timestamptz not null default now()
);

create index tasks_organization_id_idx on tasks (organization_id);

alter table tasks enable row level security;

-- Tasks are org-wide (visible to the whole team), unlike conversations.
create policy "members manage own organization tasks"
  on tasks for all
  using (organization_id = current_org_id())
  with check (organization_id = current_org_id());

-- ============================================================================
-- 005_usage.sql
-- Per-user daily request counter for the assistant, so one runaway loop
-- can't spend an org's entire model budget.
-- ============================================================================

create table usage_daily (
  organization_id uuid not null references organizations (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  day date not null default current_date,
  requests int not null default 0,
  primary key (user_id, day)
);

alter table usage_daily enable row level security;

create policy "users read own usage"
  on usage_daily for select
  using (user_id = auth.uid());

-- Written via increment_usage(), not direct inserts from the authenticated
-- role — see the function below.

create function increment_usage(daily_limit int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count int;
begin
  insert into usage_daily (organization_id, user_id, day, requests)
  values (current_org_id(), auth.uid(), current_date, 1)
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
-- 006_voyage_embeddings.sql
-- Switch the embedding provider from OpenAI (1536-dim) to Voyage (1024-dim).
-- Safe as a plain column-type change here because no chunks have been
-- embedded yet in a fresh project; a project with existing OpenAI-embedded
-- chunks would need those re-embedded, not just the column retyped.
-- ============================================================================

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

-- ============================================================================
-- 007_chat_surface.sql
-- Dedicated chat surface: adds a mode to conversations (chat = synthesized
-- + cited, search = extractive-only) and a title so the conversation list
-- has something to show besides a timestamp.
-- ============================================================================

alter table conversations
  add column mode text not null default 'chat' check (mode in ('chat', 'search'));

-- ============================================================================
-- 008_activity_log.sql
-- Append-only activity feed: a record of things that changed in this
-- workspace, so "what happened" doesn't require reconstructing it from
-- memory. Insert-only by design — no update or delete policy exists for the
-- authenticated role, matching the audit-trail pattern everywhere else in
-- this app (usage_daily, RLS itself): a log you can edit isn't a log.
-- ============================================================================

create table activity_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  actor_id uuid references profiles (id),
  action text not null,
  detail text not null,
  created_at timestamptz not null default now()
);

create index activity_log_organization_id_idx on activity_log (organization_id, created_at desc);

alter table activity_log enable row level security;

create policy "members read own organization activity"
  on activity_log for select
  using (organization_id = current_org_id());

create policy "members write own organization activity"
  on activity_log for insert
  with check (organization_id = current_org_id());

-- ============================================================================
-- 009_meetings.sql
-- Meetings the assistant (or a person, manually) schedules for the team.
-- Org-wide, like tasks — everyone in the workspace can see and manage them.
-- ============================================================================

create table meetings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  created_by uuid references profiles (id),
  title text not null,
  starts_at timestamptz not null,
  duration_minutes int not null default 30,
  notes text,
  created_at timestamptz not null default now()
);

create index meetings_organization_id_idx on meetings (organization_id, starts_at);

alter table meetings enable row level security;

create policy "members manage own organization meetings"
  on meetings for all
  using (organization_id = current_org_id())
  with check (organization_id = current_org_id());

-- ============================================================================
-- 010_meeting_attendee.sql
-- One optional external attendee per meeting, for calendar invites.
-- ============================================================================

alter table meetings
  add column attendee_email text;

-- ============================================================================
-- 011_multi_workspace.sql
-- Multi-workspace membership: a memberships join table replaces the single
-- profiles.organization_id/role columns, so one person can belong to several
-- workspaces. RLS moves from equality-on-current_org_id() to membership
-- checks (is_member_of); narrowing to the active workspace becomes the
-- application's job, not RLS's.
-- ============================================================================

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

-- ============================================================================
-- 012_email_drafts.sql
-- Email drafts: draft_email only ever inserts a 'pending' row; the one and
-- only send path is POST /api/email-drafts/[id]/send, gated behind a human
-- clicking Send in the review panel.
-- ============================================================================

create table email_drafts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  created_by uuid not null references profiles (id) on delete cascade,
  to_email text not null default '',
  subject text not null default '',
  body text not null default '',
  reply_to_email text,
  status text not null default 'pending' check (status in ('pending', 'sent', 'discarded')),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index email_drafts_organization_id_idx on email_drafts (organization_id, created_at desc);

alter table email_drafts enable row level security;

create policy "members manage own organization email drafts"
  on email_drafts for all
  using (is_member_of(organization_id))
  with check (is_member_of(organization_id));

-- ============================================================================
-- 013_knowledge_dataset.sql
-- A source that parses as tabular (CSV, or a JSON array of objects) also
-- gets a flat {columns, rows} representation stored alongside its chunks,
-- so analyze_data can compute real aggregates instead of going through
-- semantic retrieval.
-- ============================================================================

alter table knowledge_sources add column dataset jsonb;

-- ============================================================================
-- 014_knowledge_restrictions.sql
-- Per-source access restriction: a deny-list on top of the existing
-- org-level isolation, so a member can be excluded from one specific
-- source without touching their workspace role.
-- ============================================================================

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

-- ============================================================================
-- 015_membership_visibility_fix.sql
-- 011 scoped membership visibility to your own row only, which silently
-- broke the Team page and anything else that needs to see teammates.
-- Widened to the same "sharing a workspace" shape used for profiles.
-- ============================================================================

create policy "members read memberships sharing a workspace"
  on memberships for select
  using (is_member_of(organization_id));

-- ============================================================================
-- 016_forms.sql
-- Forms: build, publish, share, and collect responses. Public fetch/submit
-- goes through the service-role key since respondents have no session.
-- ============================================================================

create table forms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  created_by uuid references profiles (id),
  title text not null,
  description text,
  fields jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index forms_organization_id_idx on forms (organization_id, created_at desc);

alter table forms enable row level security;

create policy "members manage own organization forms"
  on forms for all
  using (is_member_of(organization_id))
  with check (is_member_of(organization_id));

create table form_responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references forms (id) on delete cascade,
  organization_id uuid not null references organizations (id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  respondent_email text,
  submitted_at timestamptz not null default now()
);

create index form_responses_form_id_idx on form_responses (form_id, submitted_at desc);

alter table form_responses enable row level security;

create policy "members read own organization form responses"
  on form_responses for select
  using (is_member_of(organization_id));
