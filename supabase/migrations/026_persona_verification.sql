-- Verified access for sensitive knowledge sources (e.g. an NGO's ARV patient
-- registry). See docs/verified-access.md.
--
-- Identity is not authorization: completing a Persona inquiry proves someone
-- is a real, specific human. It does not by itself mean they're allowed to
-- see a given org's most sensitive data. That's a separate, admin-granted
-- flag (sensitive_access_approved) — both must be true.

alter table profiles add column if not exists persona_inquiry_id text;
alter table profiles add column if not exists persona_verified_at timestamptz;
alter table profiles add column if not exists sensitive_access_approved boolean not null default false;

alter table knowledge_sources add column if not exists requires_verification boolean not null default false;

-- SECURITY DEFINER so it can read the caller's own profile row regardless of
-- profiles' own RLS shape; still scoped to auth.uid(), never another user's.
create function has_verified_sensitive_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select persona_verified_at is not null and sensitive_access_approved
     from profiles where id = auth.uid()),
    false
  )
$$;

-- Extend the existing per-source read policy: a source additionally requires
-- verified + approved access when requires_verification is set. This runs
-- underneath match_knowledge_chunks too (SECURITY INVOKER, so RLS applies),
-- which is what makes this an infrastructure-level gate rather than a
-- prompt-level instruction the model could be talked out of.
drop policy "members read own organization sources" on knowledge_sources;
create policy "members read own organization sources"
  on knowledge_sources for select
  using (
    is_member_of(organization_id)
    and not is_restricted_from(id)
    and (not requires_verification or has_verified_sensitive_access())
  );

drop policy "members read own organization chunks" on knowledge_chunks;
create policy "members read own organization chunks"
  on knowledge_chunks for select
  using (
    is_member_of(organization_id)
    and not is_restricted_from(source_id)
    and (
      not exists (
        select 1 from knowledge_sources s
        where s.id = knowledge_chunks.source_id and s.requires_verification
      )
      or has_verified_sensitive_access()
    )
  );

-- Every decision touching a requires_verification source, allowed or denied,
-- tied to a verified identity rather than an anonymous session (see "Step 4"
-- in docs/verified-access.md). Written with the service-role client from the
-- knowledge search path, so no member-facing insert policy is needed —
-- members can read their own org's log, nothing more.
create table access_audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  source_id uuid references knowledge_sources (id) on delete set null,
  decision text not null check (decision in ('allowed', 'denied')),
  query text not null,
  created_at timestamptz not null default now()
);

create index access_audit_log_organization_id_idx on access_audit_log (organization_id);

alter table access_audit_log enable row level security;

create policy "members read own organization access log"
  on access_audit_log for select
  using (is_member_of(organization_id));
