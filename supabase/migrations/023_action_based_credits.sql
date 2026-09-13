-- Sponsored credits move from "meter answers" to "meter actions" — every
-- chargeable thing the assistant does (an answer, a task, a meeting, an
-- email) gets its own usage_event with its own cost, instead of one event
-- per chat turn. Pre-launch data only, so this drops and recreates rather
-- than migrating old rows. See docs/sponsored-credits.md.

drop function if exists record_usage_event(uuid, text, bigint);
drop table if exists usage_events;

create table usage_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  action text not null check (action in ('answer', 'task', 'meeting', 'email')),
  outcome text not null check (outcome in ('completed', 'refused', 'failed')),
  credits int not null default 0,
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

-- credit_balance is credit units, not lamports or money — no direct member
-- update policy on organizations for it. Debiting happens only through this
-- function, which checks membership itself.
create function record_usage_event(org_id uuid, event_action text, event_outcome text, event_credits int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_member_of(org_id) then
    raise exception 'not_a_member' using errcode = 'P0001';
  end if;

  insert into usage_events (organization_id, action, outcome, credits)
  values (org_id, event_action, event_outcome, event_credits);

  if event_outcome = 'completed' then
    update organizations set credit_balance = credit_balance - event_credits where id = org_id;
  end if;
end;
$$;
