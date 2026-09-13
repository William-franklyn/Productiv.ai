-- Bug found by live testing: the knowledge_chunks policy's inline
-- `not exists (select 1 from knowledge_sources ...)` subquery is itself
-- subject to knowledge_sources' own RLS SELECT policy. For an unverified
-- user, that policy already hides the sensitive source row, so the EXISTS
-- returns false and NOT EXISTS becomes vacuously true — the exact opposite
-- of the intended gate. An unverified member could read chunk content
-- straight from knowledge_chunks even though the parent source was
-- correctly hidden.
--
-- Fix: check requires_verification through a SECURITY DEFINER function,
-- same pattern as is_restricted_from, so it bypasses knowledge_sources' RLS
-- instead of inheriting it.
create function source_requires_verification(src uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select requires_verification from knowledge_sources where id = src), false)
$$;

drop policy "members read own organization chunks" on knowledge_chunks;
create policy "members read own organization chunks"
  on knowledge_chunks for select
  using (
    is_member_of(organization_id)
    and not is_restricted_from(source_id)
    and (not source_requires_verification(source_id) or has_verified_sensitive_access())
  );
