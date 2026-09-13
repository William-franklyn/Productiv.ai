# iRABU

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript) ![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20RLS-3ECF8E?logo=supabase) ![Solana](https://img.shields.io/badge/Solana-devnet-9945FF?logo=solana) ![Claude](https://img.shields.io/badge/Anthropic-Claude-D97757)

iRABU is an AI operating system for organizations that do more with less —
public schools, NGOs, nonprofits, farmer co-ops, and small teams without a
budget for a normal enterprise software stack. One chat interface, 30+
agentic tools, a knowledge base with cited answers, and a funding model built
so a donor can pay for the platform directly and transparently, without ever
seeing what anyone asked.

## Why

Most under-resourced organizations run on paper: weekly plans on a wall,
records in a stack nobody can search, technology donations nobody had the
capacity to actually use. iRABU replaces that with one place a team can ask
a question in plain language, get a sourced answer, and have the same
assistant act on it — and a way for a sponsor to fund that usage directly,
transparently, without a budget line the organization has to defend every
quarter.

## What's built

- **Multi-tenant auth** — Supabase Auth + Postgres RLS, one organization per
  workspace, owner/admin/member roles, invite-by-link, multi-workspace
  membership.
- **Knowledge platform** — upload `.txt` / `.md` / `.csv` / `.json` / `.pdf`,
  chunked and embedded with Voyage (`voyage-3.5`, 1024-dim), retrieved by
  cosine similarity scoped to your org. Scanned/image-only PDFs fall back to
  Gemini's multimodal reading when there's no text layer to extract.
- **Assistant chat** — Claude via the Vercel AI SDK's streaming tool-calling
  loop, 30+ tools spanning knowledge search with citations, tasks, meetings,
  email drafting, chart generation, data analysis, and finance workflows.
  Cross-session memory via Backboard.io; voice input/output via ElevenLabs.
- **Verified access** — an org's most sensitive knowledge sources can require
  Persona identity verification *and* a separate per-organization admin
  approval before the agent — or anyone — can read them, enforced in
  Postgres RLS underneath the tool itself. See
  [`docs/verified-access.md`](docs/verified-access.md).
- **Sponsored credits** — a donor funds an organization's usage directly on
  Solana; every answer/task/meeting/email is metered and settled on-chain as
  a public, verifiable, spend-restricted ledger. See
  [`docs/sponsored-credits.md`](docs/sponsored-credits.md).
- **Finance workflows** — a Capital One (Nessie) sandbox integration for
  paying vendors and recording received payments, with its own receipt
  ledger.
- **Team & Settings** — member list, invite links, workspace rename, identity
  verification, sensitive-access approval, and an explicit "assistant
  capabilities" panel.
- **Per-user daily rate limit** on the assistant, enforced in Postgres.

## Architecture

### System overview

```mermaid
flowchart LR
    UI["Chat UI — Next.js App Router"]

    subgraph API["Next.js API routes"]
        Chat["assistant chat route"]
        Knowledge["knowledge routes"]
        Identity["identity verify route"]
        SponsorAPI["sponsor page route"]
        Sweep["settlement sweep route"]
    end

    subgraph DB["Supabase"]
        PG[("Postgres + Row-Level Security")]
        Vec[("pgvector")]
        Files[("File storage")]
    end

    subgraph AIProviders["AI providers"]
        Claude["Anthropic Claude — chat + tools"]
        Voyage["Voyage — embeddings"]
        Gemini["Gemini — scanned PDF fallback"]
    end

    subgraph External["External services"]
        Persona["Persona — identity verification"]
        Solana["Solana devnet — sponsor ledger"]
        Backboard["Backboard.io — cross-session memory"]
        Nessie["Capital One Nessie — sandbox banking"]
        Resend["Resend — email"]
        Eleven["ElevenLabs — voice"]
    end

    Cron["Vultr cron — external timer"]

    UI --> Chat
    UI --> Knowledge
    UI --> Identity
    UI --> SponsorAPI

    Chat --> Claude
    Chat --> PG
    Chat --> Backboard
    Chat --> Nessie
    Chat --> Resend
    Chat --> Eleven

    Knowledge --> Voyage
    Knowledge --> Gemini
    Knowledge --> Vec
    Knowledge --> Files

    Identity --> Persona
    SponsorAPI --> Solana
    Cron --> Sweep
    Sweep --> Solana

    PG --- Vec
```

### A single chat turn

Every message goes through memory recall, the tool-calling loop, and a
security boundary the model itself never touches — RLS decides what
`search_knowledge` can see, not a prompt instruction.

```mermaid
sequenceDiagram
    participant U as User
    participant R as assistant chat route
    participant M as Backboard memory
    participant C as Claude tool loop
    participant K as Knowledge base (RLS-scoped)
    participant L as Usage ledger

    U->>R: send message
    R->>M: search relevant memories
    M-->>R: prior facts, if any
    R->>C: system prompt + memory + tool definitions
    loop as needed
        C->>K: search_knowledge / create_task / schedule_meeting / ...
        K-->>C: RLS-filtered results only
    end
    C-->>R: streamed answer + citations
    R-->>U: streamed response
    R->>M: write this exchange to memory
    R->>L: record a usage event
```

### Verified access — identity is not authorization

Two independent gates, both required, enforced in the database rather than
the prompt. See [`docs/verified-access.md`](docs/verified-access.md) for the
three real RLS bugs this design surfaced under live testing.

```mermaid
flowchart TD
    A["User completes a Persona inquiry"] --> B["Server confirms status directly with Persona — never trusts the client callback"]
    B --> C{"Approved?"}
    C -- No --> D["profiles.persona_verified_at stays null"]
    C -- Yes --> E["profiles.persona_verified_at is set"]
    E --> F{"Org owner/admin approves this person?"}
    F -- No --> G["memberships.sensitive_access_approved = false"]
    F -- Yes --> H["memberships.sensitive_access_approved = true"]
    G --> I["RLS denies the sensitive source"]
    H --> J["RLS allows the sensitive source"]
    I --> K["Denial logged to access_audit_log"]
    J --> L["Agent's search_knowledge tool can surface it"]
    L --> M["Allowed read logged to access_audit_log"]
```

### Sponsored credits — funding on Solana

```mermaid
flowchart LR
    Donor["Sponsor / donor"] -->|"funds the org's receive-only wallet"| Fund["Solana devnet transfer"]
    Fund --> Balance["organizations.credit_balance increases"]
    Balance --> Usage["Org uses the assistant"]
    Usage --> Event["usage_events row: answer / task / meeting / email"]
    Event --> Decrement["credit_balance decreases"]
    Event --> Threshold{"3+ unsettled events?"}
    Threshold -- "via chat traffic" --> Settle["settleUnsettledUsage"]
    Timer["Vultr cron, every 5 min"] -->|"catches stragglers chat traffic never reached"| Settle
    Settle --> Memo["Anchored as a Solana memo transaction"]
    Memo --> Ledger["Public, verifiable ledger on the sponsor page"]
```

### Core data model

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ MEMBERSHIPS : has
    PROFILES ||--o{ MEMBERSHIPS : belongs_to
    ORGANIZATIONS ||--o{ KNOWLEDGE_SOURCES : owns
    KNOWLEDGE_SOURCES ||--o{ KNOWLEDGE_CHUNKS : chunked_into
    ORGANIZATIONS ||--o{ USAGE_EVENTS : meters
    ORGANIZATIONS ||--o{ ACCESS_AUDIT_LOG : logs
    KNOWLEDGE_SOURCES ||--o{ ACCESS_AUDIT_LOG : referenced_by

    ORGANIZATIONS {
        uuid id
        text name
        int credit_balance
        text sponsor_slug
        text backboard_assistant_id
    }
    MEMBERSHIPS {
        uuid user_id
        uuid organization_id
        text role
        boolean sensitive_access_approved
    }
    PROFILES {
        uuid id
        text full_name
        timestamptz persona_verified_at
    }
    KNOWLEDGE_SOURCES {
        uuid id
        text name
        boolean requires_verification
    }
    USAGE_EVENTS {
        uuid id
        text action
        text outcome
        int credits
        text tx_sig
    }
```

## Stack

- **Frontend/API:** Next.js 16 (App Router), TypeScript, Tailwind v4
- **Database/Auth:** Supabase — Postgres, pgvector, Row-Level Security, multi-tenant, multi-workspace
- **AI:** Anthropic Claude (chat + tool-calling), Voyage (embeddings), Gemini (scanned-PDF fallback)
- **Identity:** Persona (verification gating sensitive sources)
- **Blockchain:** Solana devnet (sponsored-credit settlement ledger)
- **Memory:** Backboard.io (cross-session chat memory)
- **Finance sandbox:** Capital One Nessie API
- **Comms:** Resend (email), ElevenLabs (voice)
- **Infra:** Vercel (hosting), Vultr (external settlement-sweep cron)
- **Charts:** Recharts, rendered from structured data the assistant produces

## Getting started

1. Create a **new** Supabase project (don't point this at an existing one —
   the schema is destructive-friendly and assumes it owns the database).
2. In the Supabase SQL editor, run `supabase/schema.sql` once.
3. In Supabase Auth settings, either disable "Confirm email" for the fastest
   local demo loop, or be ready to click the confirmation link after signup.
4. Copy `.env.example` to `.env.local` and fill in at minimum
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, and `ANTHROPIC_API_KEY` — every other key in
   `.env.example` is optional and degrades gracefully when absent (see the
   comment above each one for exactly what turns off without it).

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

iRABU's feature set and design share underlying ideas with the author's
earlier products, **getirabu.com** (marketing site) and **irabu.ai** (the
permission-aware chat app) — same author, same lineage of thinking, but this
is a separate, from-scratch codebase, not a copy of either repository's
source.
