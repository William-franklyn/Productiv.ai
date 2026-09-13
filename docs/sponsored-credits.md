# Sponsored Workspace Credits

A workspace runs on credit. Someone funds it, members ask questions, and every
answer is accounted for publicly.

Two rails, two jobs:

| | Rail | Job |
|---|---|---|
| **Money in** | Capital One Nessie | Sponsor moves real (sandbox) funds into a workspace |
| **Money spent** | Solana (devnet) | Public, verifiable record of what those funds bought |

Nessie moves value. Solana proves consumption. They never overlap.

---

## Why

The unanswered question in a grounded-AI workspace is who pays for inference
when the customer is a school, an NGO, or a small employer. A sponsor does.

But a sponsor funding a classroom doesn't want a quarterly PDF saying "your
money helped 60 students." They want a ledger: 4,312 answers, which workspace,
what it cost, verifiable by anyone.

**The key design idea:** the sponsor ledger and the gap log are the same data.
A sponsor sees questions answered *and* questions the workspace couldn't
answer — because the second number is a funding signal. It says this workspace
needs more material, not just more credit.

Money follows gaps.

---

## Surfaces

**Admin** — workspace Settings
Balance chip denominated in answers, not currency ("≈ 380 answers left").
One button: *Get a funding link*.

**Sponsor** — `/sponsor/[slug]` — public, no login
Workspace name, who runs it, answers funded, questions unanswered, live ledger.
Pick amount, fund, done. This page is the feature. It's what gets forwarded to
a donor network and what goes on screen at judging.

**Member** — nothing
No balance, no cost, no "3 questions left." The moment someone feels metered
they stop asking questions, and asking questions is the product.

---

## Schema

Adapted to this codebase's actual multi-tenant unit (`organizations`, not a
separate `workspaces` table) and its existing Nessie connection table (reused
rather than duplicated):

```sql
-- additions to organizations
wallet_address   text
credit_balance   bigint
sponsor_slug     text unique
-- Nessie account: reuses the existing nessie_connections table already
-- built for the Finance feature, instead of a new nessie_account column.

create table usage_events (
  id                uuid primary key,
  organization_id   uuid references organizations(id),
  kind              text check (kind in ('answered','refused')),
  cost_lamports     bigint default 0,
  tx_sig            text,
  created_at        timestamptz default now()
);
```

## Flow

1. Sponsor funds via Nessie deposit → `organizations.credit_balance` credited
2. Member asks a question in the assistant
3. The chat route resolves the answer as normal (search_knowledge, tools, etc.)
4. **Answered** → debit, write `usage_event(kind='answered')`
5. **Refused** (search_knowledge found nothing and no other tool succeeded)
   → write `usage_event(kind='refused')`, `cost = 0`
6. Settle on-chain in batches (every N unsettled events) → one Solana devnet
   memo transaction anchoring the batch's counts and lamport total, `tx_sig`
   stored back onto every event in that batch

### Two behaviours that matter

**Refusals are free.** The AI said "I don't have material on this." Nobody
pays for a non-answer.

**Zero balance never interrupts.** Finish the answer in flight. Never cut
someone off mid-lesson — credit balance can go negative; it's a funding
signal for the admin, not a hard stop for members.

---

## Privacy

On-chain: amounts, organization IDs, counts, a batch timestamp.
Never: member identity, query content, or anything linking a person to a topic.

A permanent public record of which member asked about which subject is the one
thing this must not become. On-chain is forever and cannot be erased.

Hold the ability to verify, not to read.

---

## Env

```
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_TREASURY_KEYPAIR=
NESSIE_API_KEY=
LAMPORTS_PER_ANSWER=
```

Devnet and Nessie sandbox only. No real funds.
