-- Tasks can now be assigned to a specific teammate, not just created and
-- left for whoever picks it up.
alter table tasks add column assigned_to uuid references profiles (id) on delete set null;

create index tasks_assigned_to_idx on tasks (assigned_to);
