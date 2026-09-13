-- Bug found by live testing: sensitive_access_approved lived on profiles as
-- a single global flag, but a user can belong to more than one organization
-- (see docs/workspaces note in 011_multi_workspace.sql). The old
-- protect_sensitive_access_approval trigger checked "is the caller an
-- owner/admin in SOME org, and is the target a member in SOME org" without
-- requiring it to be the SAME org — so a user who owns their own unrelated
-- workspace could "approve" themselves for a completely different org's
-- sensitive sources, just by virtue of being an owner anywhere. Approval is
-- inherently per-(user, org), exactly like role already is — so it belongs
-- on memberships, not profiles.
alter table memberships add column if not exists sensitive_access_approved boolean not null default false;

drop trigger protect_sensitive_access_approval on profiles;
drop function protect_sensitive_access_approval();

alter table profiles drop column if exists sensitive_access_approved;

-- Now trivially correct: the row being updated IS the org-scoped grant, so
-- the check only needs one lookup, no join, and no way to cross organization
-- boundaries.
create function protect_membership_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.sensitive_access_approved is distinct from old.sensitive_access_approved then
    if not exists (
      select 1 from memberships
      where user_id = auth.uid()
        and organization_id = new.organization_id
        and role in ('owner', 'admin')
    ) then
      raise exception 'Only an owner or admin of this organization can change sensitive_access_approved';
    end if;
  end if;
  return new;
end;
$$;

create trigger protect_membership_approval
before update on memberships
for each row
execute function protect_membership_approval();

drop policy "members read own organization sources" on knowledge_sources;
drop policy "members read own organization chunks" on knowledge_chunks;
drop function has_verified_sensitive_access();

create function has_verified_sensitive_access(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.persona_verified_at is not null and m.sensitive_access_approved
      from profiles p
      join memberships m on m.user_id = p.id and m.organization_id = org
      where p.id = auth.uid()
    ),
    false
  )
$$;

create policy "members read own organization sources"
  on knowledge_sources for select
  using (
    is_member_of(organization_id)
    and not is_restricted_from(id)
    and (not requires_verification or has_verified_sensitive_access(organization_id))
  );

create policy "members read own organization chunks"
  on knowledge_chunks for select
  using (
    is_member_of(organization_id)
    and not is_restricted_from(source_id)
    and (not source_requires_verification(source_id) or has_verified_sensitive_access(organization_id))
  );
