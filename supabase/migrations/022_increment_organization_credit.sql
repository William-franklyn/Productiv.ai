-- Called only from the public sponsor-funding route via the service-role
-- client — a sponsor has no membership to check, so unlike
-- record_usage_event this doesn't gate on is_member_of. Its job is atomicity
-- (avoid a read-then-write race), not access control.
create function increment_organization_credit(org_id uuid, lamports bigint)
returns void
language sql
security definer
set search_path = public
as $$
  update organizations set credit_balance = credit_balance + lamports where id = org_id;
$$;
