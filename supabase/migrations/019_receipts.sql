-- A unified ledger of completed money movement, both directions — created
-- the moment a payment actually sends (not when it's merely drafted) or
-- money is recorded as received. This is the source of truth for the
-- workspace's effective balance and for "what happened in that transaction"
-- lookups from chat, independent of pending_payments' approval workflow.
create table receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  direction text not null check (direction in ('sent', 'received')),
  counterparty text not null,
  amount numeric(12, 2) not null check (amount > 0),
  notes text,
  transaction_id text not null,
  created_by uuid references profiles (id),
  occurred_at timestamptz not null default now()
);

create index receipts_organization_id_idx on receipts (organization_id, occurred_at desc);

alter table receipts enable row level security;

create policy "members manage own organization receipts"
  on receipts for all
  using (is_member_of(organization_id))
  with check (is_member_of(organization_id));
