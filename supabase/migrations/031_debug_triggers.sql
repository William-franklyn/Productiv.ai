create function debug_list_triggers(tbl text)
returns table (tgname text, tgenabled text, funcname text)
language sql
stable
security definer
set search_path = public
as $$
  select t.tgname::text, t.tgenabled::text, p.proname::text
  from pg_trigger t
  join pg_proc p on p.oid = t.tgfoid
  where t.tgrelid = tbl::regclass and not t.tgisinternal
$$;

create function debug_current_uid()
returns uuid
language sql
stable
as $$
  select auth.uid()
$$;
