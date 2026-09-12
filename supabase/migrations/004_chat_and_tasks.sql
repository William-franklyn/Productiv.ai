-- Assistant conversations and the tasks the assistant can create on a user's
-- behalf.

create table conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  citations jsonb not null default '[]',
  chart jsonb,
  created_at timestamptz not null default now()
);

create index conversations_user_id_idx on conversations (user_id);
create index messages_conversation_id_idx on messages (conversation_id);

alter table conversations enable row level security;
alter table messages enable row level security;

-- Conversations are personal — visible only to the user who started them,
-- not the whole organization.
create policy "users manage own conversations"
  on conversations for all
  using (user_id = auth.uid() and organization_id = current_org_id())
  with check (user_id = auth.uid() and organization_id = current_org_id());

create policy "users manage messages in own conversations"
  on messages for all
  using (
    conversation_id in (select id from conversations where user_id = auth.uid())
  )
  with check (
    conversation_id in (select id from conversations where user_id = auth.uid())
  );

create table tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  created_by uuid references profiles (id),
  title text not null,
  status text not null default 'open' check (status in ('open', 'done')),
  due_date date,
  created_at timestamptz not null default now()
);

create index tasks_organization_id_idx on tasks (organization_id);

alter table tasks enable row level security;

-- Tasks are org-wide (visible to the whole team), unlike conversations.
create policy "members manage own organization tasks"
  on tasks for all
  using (organization_id = current_org_id())
  with check (organization_id = current_org_id());
