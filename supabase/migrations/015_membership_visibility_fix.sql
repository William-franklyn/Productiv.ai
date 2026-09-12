-- 011 gave every user a select policy scoped to *their own* membership row
-- only (user_id = auth.uid()), which was meant as a starting point but never
-- widened — it silently broke every feature that needs to see teammates:
-- the Team page's member list, the knowledge-access picker, and
-- restrict_source_access's name lookup all query this table and got back a
-- single row. Membership rows aren't sensitive the way the invite token or
-- API key are — being able to see who else shares your workspace is the
-- whole point of a Team page — so this widens it to the same
-- "sharing a workspace" shape already used for profiles.
drop policy "users read own memberships" on memberships;

create policy "members read memberships sharing a workspace"
  on memberships for select
  using (is_member_of(organization_id));
