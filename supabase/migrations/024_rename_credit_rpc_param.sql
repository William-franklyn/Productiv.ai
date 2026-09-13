-- increment_organization_credit's parameter was named `lamports` from when
-- funding credited raw lamports directly. credit_balance is credit units
-- now (see 023), so the function is recreated with a name that matches.
drop function if exists increment_organization_credit(uuid, bigint);

create function increment_organization_credit(org_id uuid, credit_amount bigint)
returns void
language sql
security definer
set search_path = public
as $$
  update organizations set credit_balance = credit_balance + credit_amount where id = org_id;
$$;
