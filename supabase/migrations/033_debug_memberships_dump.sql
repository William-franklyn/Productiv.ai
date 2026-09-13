create function debug_my_memberships()
returns table (user_id uuid, organization_id uuid, role text, current_uid uuid)
language sql
stable
security definer
set search_path = public
as $$
  select m.user_id, m.organization_id, m.role::text, auth.uid()
  from memberships m
  where m.user_id = auth.uid()
$$;
