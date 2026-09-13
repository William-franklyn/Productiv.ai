-- Sponsored workspace credits. Nessie (already connected per-org via
-- nessie_connections) moves money in; a Solana devnet memo transaction
-- anchors a public, verifiable — but anonymous — record of what got spent.
-- See docs/sponsored-credits.md for the full design.

alter table organizations add column wallet_address text;
alter table organizations add column credit_balance bigint not null default 0;
alter table organizations add column sponsor_slug text unique;

create table usage_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  kind text not null check (kind in ('answered', 'refused')),
  cost_lamports bigint not null default 0,
  tx_sig text,
  created_at timestamptz not null default now()
);

create index usage_events_organization_id_idx on usage_events (organization_id, created_at desc);
create index usage_events_unsettled_idx on usage_events (organization_id) where tx_sig is null;

alter table usage_events enable row level security;

create policy "members read own organization usage events"
  on usage_events for select
  using (is_member_of(organization_id));

create policy "members write own organization usage events"
  on usage_events for insert
  with check (is_member_of(organization_id));

-- Settlement runs through the service-role key (no member-facing update
-- path needed for tx_sig backfill), same reasoning as other admin-only
-- writes in this schema.

-- credit_balance is financial state — no direct member update policy on
-- organizations for it. Debiting happens only through this function, which
-- checks membership itself rather than relying on a row policy.
create function record_usage_event(org_id uuid, event_kind text, lamports bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_member_of(org_id) then
    raise exception 'not_a_member' using errcode = 'P0001';
  end if;

  insert into usage_events (organization_id, kind, cost_lamports)
  values (org_id, event_kind, lamports);

  if event_kind = 'answered' then
    update organizations set credit_balance = credit_balance - lamports where id = org_id;
  end if;
end;
$$;
