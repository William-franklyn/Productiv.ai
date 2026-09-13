-- Bug: memberships has no UPDATE policy for the authenticated role at all
-- (only select — see 011/015_membership_visibility_fix.sql), matching this
-- codebase's convention that membership mutations go through the
-- service-role client, trusted because the calling route already checked
-- authorization (e.g. bootstrap/route.ts). auth.uid() is NULL on a
-- service-role connection, so the previous version of this trigger's
-- `user_id = auth.uid()` check could never match — it unconditionally
-- blocked even the legitimate approval route.
--
-- The trigger only needs to guard the path RLS doesn't already block: a
-- direct, RLS-scoped write using someone's own session (auth.uid() is set),
-- which is exactly what a member attempting to self-approve looks like. A
-- service-role write (auth.uid() is null) is trusted the same way every
-- other membership mutation in this schema already is.
create or replace function protect_membership_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.sensitive_access_approved is distinct from old.sensitive_access_approved
     and auth.uid() is not null then
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
