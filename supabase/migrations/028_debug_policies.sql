create function debug_list_policies(tbl text)
returns table (policyname text, cmd text, qual text)
language sql
stable
security definer
set search_path = public
as $$
  select polname::text, case polcmd when 'r' then 'select' when 'w' then 'update' when 'a' then 'insert' when 'd' then 'delete' else '*' end, pg_get_expr(polqual, polrelid)
  from pg_policy
  where polrelid = tbl::regclass
$$;
