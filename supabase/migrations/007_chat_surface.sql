-- Dedicated chat surface: adds a mode to conversations (chat = synthesized
-- + cited, search = extractive-only) and a title so the conversation list
-- has something to show besides a timestamp.

alter table conversations
  add column mode text not null default 'chat' check (mode in ('chat', 'search'));

-- Existing rows already default to 'New conversation'; nothing to backfill.
