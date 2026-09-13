create function debug_approval_check(target uuid)
returns table (current_uid uuid, would_block boolean)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    auth.uid(),
    not exists (
      select 1
      from memberships approver
      join memberships tgt on tgt.organization_id = approver.organization_id
      where approver.user_id = auth.uid()
        and approver.role in ('owner', 'admin')
        and tgt.user_id = target
    );
end;
$$;
