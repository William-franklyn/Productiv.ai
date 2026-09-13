-- Cross-session chat memory (Backboard.io). One Backboard "assistant" per
-- ProductivAI organization — memory is shared across every member and every
-- conversation in that org, matching how the rest of the app scopes data.
-- Created lazily on first chat message; null until then.
alter table organizations add column if not exists backboard_assistant_id text;
