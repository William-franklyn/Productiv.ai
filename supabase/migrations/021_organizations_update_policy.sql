-- organizations never had an update policy — every member-facing write
-- (renaming the workspace, and now setting sponsor_slug) has been silently
-- doing nothing under RLS, since role-gating happens in the route handler,
-- not here. RLS's job is tenant isolation; the app already checks the
-- owner/admin requirement before calling this.
create policy "members update own organization"
  on organizations for update
  using (is_member_of(id))
  with check (is_member_of(id));
