-- Per-user daily request counter for the assistant, so one runaway loop
-- can't spend an org's entire model budget.

create table usage_daily (
  organization_id uuid not null references organizations (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  day date not null default current_date,
  requests int not null default 0,
  primary key (user_id, day)
);

alter table usage_daily enable row level security;

create policy "users read own usage"
  on usage_daily for select
  using (user_id = auth.uid());

-- Written via increment_usage(), not direct inserts from the authenticated
-- role — see the function below.

create function increment_usage(daily_limit int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count int;
begin
  insert into usage_daily (organization_id, user_id, day, requests)
  values (current_org_id(), auth.uid(), current_date, 1)
  on conflict (user_id, day)
  do update set requests = usage_daily.requests + 1
  returning requests into current_count;

  if current_count > daily_limit then
    raise exception 'daily_limit_exceeded' using errcode = 'P0001';
  end if;

  return current_count;
end;
$$;
