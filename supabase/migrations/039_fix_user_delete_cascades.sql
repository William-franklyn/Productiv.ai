-- Deleting a user in Supabase Auth cascades to their profiles row
-- (001_orgs_and_profiles.sql: profiles.id ... on delete cascade), but nine
-- other tables reference profiles(id) with no ON DELETE action at all,
-- which defaults to RESTRICT — so deleting any user who ever created a
-- task, uploaded a document, sent a chat, drafted a payment, etc. fails the
-- whole cascade with a foreign key violation, and the user can't be deleted
-- at all. These are all "who created this org-owned resource" audit
-- references, not ownership — the resource should survive the creator
-- leaving, so ON DELETE SET NULL is correct here (never CASCADE, which
-- would delete the org's own data just because a member left).
alter table org_invites drop constraint org_invites_created_by_fkey;
alter table org_invites add constraint org_invites_created_by_fkey
  foreign key (created_by) references profiles (id) on delete set null;

alter table knowledge_sources drop constraint knowledge_sources_created_by_fkey;
alter table knowledge_sources add constraint knowledge_sources_created_by_fkey
  foreign key (created_by) references profiles (id) on delete set null;

alter table tasks drop constraint tasks_created_by_fkey;
alter table tasks add constraint tasks_created_by_fkey
  foreign key (created_by) references profiles (id) on delete set null;

alter table activity_log drop constraint activity_log_actor_id_fkey;
alter table activity_log add constraint activity_log_actor_id_fkey
  foreign key (actor_id) references profiles (id) on delete set null;

alter table meetings drop constraint meetings_created_by_fkey;
alter table meetings add constraint meetings_created_by_fkey
  foreign key (created_by) references profiles (id) on delete set null;

alter table forms drop constraint forms_created_by_fkey;
alter table forms add constraint forms_created_by_fkey
  foreign key (created_by) references profiles (id) on delete set null;

alter table nessie_connections drop constraint nessie_connections_created_by_fkey;
alter table nessie_connections add constraint nessie_connections_created_by_fkey
  foreign key (created_by) references profiles (id) on delete set null;

alter table pending_payments drop constraint pending_payments_created_by_fkey;
alter table pending_payments add constraint pending_payments_created_by_fkey
  foreign key (created_by) references profiles (id) on delete set null;

alter table receipts drop constraint receipts_created_by_fkey;
alter table receipts add constraint receipts_created_by_fkey
  foreign key (created_by) references profiles (id) on delete set null;
