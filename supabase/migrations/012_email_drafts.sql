-- Email drafts: the assistant can compose an email but can never send one
-- itself. draft_email only ever inserts a 'pending' row here; the one and
-- only send path is POST /api/email-drafts/[id]/send, which a human has to
-- click from the review panel.

create table email_drafts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  created_by uuid not null references profiles (id) on delete cascade,
  to_email text not null default '',
  subject text not null default '',
  body text not null default '',
  reply_to_email text,
  status text not null default 'pending' check (status in ('pending', 'sent', 'discarded')),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index email_drafts_organization_id_idx on email_drafts (organization_id, created_at desc);

alter table email_drafts enable row level security;

create policy "members manage own organization email drafts"
  on email_drafts for all
  using (is_member_of(organization_id))
  with check (is_member_of(organization_id));
