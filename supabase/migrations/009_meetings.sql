-- Meetings the assistant (or a person, manually) schedules for the team.
-- Org-wide, like tasks — everyone in the workspace can see and manage them.

create table meetings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  created_by uuid references profiles (id),
  title text not null,
  starts_at timestamptz not null,
  duration_minutes int not null default 30,
  notes text,
  created_at timestamptz not null default now()
);

create index meetings_organization_id_idx on meetings (organization_id, starts_at);

alter table meetings enable row level security;

create policy "members manage own organization meetings"
  on meetings for all
  using (organization_id = current_org_id())
  with check (organization_id = current_org_id());
