-- Finance: a workspace connects one demo Capital One (Nessie) sandbox
-- account, and the assistant can read its balance/transactions and draft
-- vendor payments. Nessie has no OAuth — the whole app shares one
-- NESSIE_API_KEY, and each org gets its own sandbox customer + account under
-- it, tracked here.

create table nessie_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade unique,
  customer_id text not null,
  account_id text not null,
  nickname text not null default 'Business Checking',
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

alter table nessie_connections enable row level security;

create policy "members manage own organization nessie connection"
  on nessie_connections for all
  using (is_member_of(organization_id))
  with check (is_member_of(organization_id));

-- Same human-approval-before-send shape as email_drafts: pay_vendor only
-- ever inserts a 'pending' row here. The one and only path that actually
-- creates a real Nessie purchase is POST /api/payments/[id]/send, reachable
-- only from the review panel's own Send click.
create table pending_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  created_by uuid references profiles (id),
  vendor_name text not null,
  amount numeric(12, 2) not null check (amount > 0),
  description text,
  status text not null default 'pending' check (status in ('pending', 'sent', 'discarded')),
  nessie_purchase_id text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index pending_payments_organization_id_idx on pending_payments (organization_id, created_at desc);

alter table pending_payments enable row level security;

create policy "members manage own organization pending payments"
  on pending_payments for all
  using (is_member_of(organization_id))
  with check (is_member_of(organization_id));
