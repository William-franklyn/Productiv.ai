-- Forms: build a form, publish it, share the link, collect responses.
-- Respondents are anonymous outsiders with no Supabase session, so the
-- public fetch/submit routes go through the service-role key rather than
-- RLS — there is deliberately no insert/select policy here for the
-- unauthenticated role.

create table forms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  created_by uuid references profiles (id),
  title text not null,
  description text,
  fields jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index forms_organization_id_idx on forms (organization_id, created_at desc);

alter table forms enable row level security;

create policy "members manage own organization forms"
  on forms for all
  using (is_member_of(organization_id))
  with check (is_member_of(organization_id));

create table form_responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references forms (id) on delete cascade,
  organization_id uuid not null references organizations (id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  respondent_email text,
  submitted_at timestamptz not null default now()
);

create index form_responses_form_id_idx on form_responses (form_id, submitted_at desc);

alter table form_responses enable row level security;

create policy "members read own organization form responses"
  on form_responses for select
  using (is_member_of(organization_id));
