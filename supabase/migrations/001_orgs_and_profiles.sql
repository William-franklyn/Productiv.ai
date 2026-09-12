-- Organizations and profiles: the multi-tenant foundation.
-- Every other table in this app carries an organization_id and is scoped by
-- the same RLS pattern established here.

create extension if not exists "pgcrypto";

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid not null references organizations (id) on delete cascade,
  full_name text,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now()
);

create index profiles_organization_id_idx on profiles (organization_id);

-- Returns the caller's organization. SECURITY DEFINER so it can read
-- `profiles` on the caller's behalf without recursing into this table's own
-- RLS policy (which itself calls this function).
create function current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from profiles where id = auth.uid()
$$;

alter table organizations enable row level security;
alter table profiles enable row level security;

create policy "members read own organization"
  on organizations for select
  using (id = current_org_id());

create policy "members read profiles in own organization"
  on profiles for select
  using (organization_id = current_org_id());

create policy "members update own profile"
  on profiles for update
  using (id = auth.uid())
  with check (organization_id = current_org_id());

-- Organization and profile creation happens server-side via the service-role
-- key during signup (see src/app/api/auth/bootstrap/route.ts) — there is
-- deliberately no insert policy for the authenticated role here.

create table org_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  email text not null,
  token text not null unique,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  redeemed_at timestamptz
);

alter table org_invites enable row level security;

create policy "members read own organization invites"
  on org_invites for select
  using (organization_id = current_org_id());

create policy "members create invites for own organization"
  on org_invites for insert
  with check (organization_id = current_org_id());
