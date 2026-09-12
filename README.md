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

## Stack

- **Frontend/API:** Next.js (App Router), TypeScript, Tailwind v4
- **Database/Auth:** Supabase (Postgres + pgvector, Row-Level Security, multi-tenant)
- **AI:** Anthropic Claude for chat and answer synthesis, OpenAI embeddings for
  retrieval
- **Charts:** Recharts, rendered from structured data the assistant produces

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your own Supabase + API keys
npm run dev
```

You'll need your own Supabase project — this app is multi-tenant from the
schema up, and migrations are destructive-friendly in a fresh project. See
`supabase/migrations/` for the numbered schema files, or `supabase/schema.sql`
for the whole thing as one script.

## Status

Actively being built. Core pieces: multi-tenant auth, knowledge ingestion
(upload → chunk → embed → cite), the assistant chat with tool use, and a
dashboard shell.

## Credits

This project's architecture and product patterns build on an earlier personal
project of the author's. This is a fresh codebase under a new name and
direction, not a copy of that project's repository.
