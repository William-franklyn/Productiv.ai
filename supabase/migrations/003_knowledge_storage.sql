-- Storage bucket for uploaded knowledge files, path-scoped per tenant:
-- objects live at "{organization_id}/{source_id}/{filename}".
--
-- Policies on storage.objects require the supabase_storage_admin role. In the
-- Supabase SQL editor the whole file runs as one transaction, so if this part
-- fails on a permissions error it would otherwise roll back the bucket
-- insert above it too, silently. Wrapping it lets it fail alone.

insert into storage.buckets (id, name, public)
values ('knowledge', 'knowledge', false)
on conflict (id) do nothing;

do $$
begin
  create policy "members read own organization files"
    on storage.objects for select
    using (
      bucket_id = 'knowledge'
      and (storage.foldername(name))[1] = current_org_id()::text
    );
exception when others then
  raise notice 'skipping storage select policy (may already exist or need supabase_storage_admin): %', sqlerrm;
end $$;

do $$
begin
  create policy "members upload to own organization folder"
    on storage.objects for insert
    with check (
      bucket_id = 'knowledge'
      and (storage.foldername(name))[1] = current_org_id()::text
    );
exception when others then
  raise notice 'skipping storage insert policy (may already exist or need supabase_storage_admin): %', sqlerrm;
end $$;
