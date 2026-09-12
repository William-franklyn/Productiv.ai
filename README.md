# ProductivAI

ProductivAI is an AI knowledge assistant and automation chat for teams. Upload
your team's documents, ask questions in plain language, and get answers with
citations back to the source — plus a chat assistant that can create tasks and
turn data into charts on request.

## Why

Most teams' knowledge is scattered across docs nobody re-reads and chat
threads nobody re-finds. ProductivAI gives a team one place to ask a question
and get a sourced answer, instead of a pile of search results to read through
themselves.

## What's built

- **Multi-tenant auth** — Supabase Auth + Postgres RLS, one organization per
  workspace, owner/admin/member roles, invite-by-link.
- **Knowledge platform** — upload `.txt` / `.md` / `.csv` / `.json` / `.pdf`,
  extracted and chunked server-side, embedded with Voyage `voyage-3.5`
  (1024-dim), retrieved by cosine similarity scoped to your org.
- **Assistant chat** — Claude Sonnet 5 via the Vercel AI SDK, streaming, with
  three tools: `search_knowledge` (cited retrieval), `create_task`, and
  `generate_chart`.
- **Charts** — bar / line / stat tiles rendered with a validated,
  colorblind-safe categorical palette (fixed hue order, always a legend for
  multi-series, a table-view fallback).
- **Automations** — the task list the assistant's `create_task` tool writes
  to.
- **Team & Settings** — member list, invite links, workspace rename, and an
  explicit "assistant capabilities" panel (exactly three tools, no web access,
  no reach outside the workspace).
- **Per-user daily rate limit** on the assistant, enforced in Postgres.

## Stack

- **Frontend/API:** Next.js (App Router), TypeScript, Tailwind v4
- **Database/Auth:** Supabase (Postgres + pgvector, Row-Level Security, multi-tenant)
- **AI:** Anthropic Claude for chat and answer synthesis, Voyage embeddings for
  retrieval
- **Charts:** Recharts, rendered from structured data the assistant produces

## Getting started

1. Create a **new** Supabase project (don't point this at an existing one —
   the schema is destructive-friendly and assumes it owns the database).
2. In the Supabase SQL editor, run `supabase/schema.sql` once.
3. In Supabase Auth settings, either disable "Confirm email" for the fastest
   local demo loop, or be ready to click the confirmation link after signup.
4. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
     `SUPABASE_SERVICE_ROLE_KEY` — from Supabase project settings → API.
   - `ANTHROPIC_API_KEY` — powers the assistant chat.
   - `VOYAGE_API_KEY` — powers knowledge-chunk embeddings.

```bash
npm install
npm run dev
```

Sign up (this creates your workspace), upload a document under Knowledge, then
ask about it under Assistant.

`supabase/migrations/` holds the same schema as numbered, incremental files;
`supabase/schema.sql` is those files concatenated into one script for
standing up a fresh project in a single run.

## Credits

This project's architecture and product patterns build on an earlier personal
project of the author's. This is a fresh codebase under a new name and
direction, not a copy of that project's repository.
