-- Append-only activity feed: a record of things that changed in this
-- workspace, so "what happened" doesn't require reconstructing it from
-- memory. Insert-only by design — no update or delete policy exists for the
-- authenticated role, matching the audit-trail pattern everywhere else in
-- this app (usage_daily, RLS itself): a log you can edit isn't a log.

create table activity_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  actor_id uuid references profiles (id),
  action text not null,
  detail text not null,
  created_at timestamptz not null default now()
);

create index activity_log_organization_id_idx on activity_log (organization_id, created_at desc);

alter table activity_log enable row level security;

create policy "members read own organization activity"
  on activity_log for select
  using (organization_id = current_org_id());

create policy "members write own organization activity"
  on activity_log for insert
  with check (organization_id = current_org_id());
