-- debug_list_policies (028) was a one-off introspection helper used to
-- diagnose the RLS bug fixed in 029 — not meant to stay, since it exposes
-- policy internals over RPC to any authenticated user.
drop function if exists debug_list_policies(text);
