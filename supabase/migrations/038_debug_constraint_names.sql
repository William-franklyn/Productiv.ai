create function debug_list_fk_constraints(tables text[])
returns table (table_name text, constraint_name text)
language sql
stable
security definer
set search_path = public
as $$
  select c.conrelid::regclass::text, c.conname::text
  from pg_constraint c
  where c.contype = 'f' and c.conrelid::regclass::text = any(tables)
$$;
