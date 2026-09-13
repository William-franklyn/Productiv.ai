-- "users update own profile" (011_multi_workspace.sql) lets a member update
-- any column on their own profile row, including sensitive_access_approved —
-- without this, a member could self-grant sensitive-source access with a
-- raw Supabase call, completely bypassing the admin-approval requirement in
-- docs/verified-access.md. RLS is row-scoped, not column-scoped, so the fix
-- is a trigger, not a policy tweak.
create function protect_sensitive_access_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.sensitive_access_approved is distinct from old.sensitive_access_approved then
    if not exists (
      select 1
      from memberships approver
      join memberships target on target.organization_id = approver.organization_id
      where approver.user_id = auth.uid()
        and approver.role in ('owner', 'admin')
        and target.user_id = new.id
    ) then
      raise exception 'Only an owner or admin can change sensitive_access_approved';
    end if;
  end if;
  return new;
end;
$$;

create trigger protect_sensitive_access_approval
before update on profiles
for each row
execute function protect_sensitive_access_approval();
