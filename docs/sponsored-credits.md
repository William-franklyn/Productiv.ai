# Sponsored Credits

A workspace runs on credit. A sponsor funds it. The workspace does work —
answers, emails, tasks, meetings — and every action is accounted for on a
ledger anyone can check.

Supersedes the answer-only version of this doc.

---

## The two rails

| | Rail | What it is | Withdrawable |
|---|---|---|---|
| **Sponsor credit** | Solana (devnet) | The org's consumption of the platform | **Never** |
| **Org money** | Capital One Nessie (sandbox) | The org's own funds moving to its own people | Yes — it's theirs |

**These never touch.** Separate tables, separate balances, no conversion path,
no shared code path. Sponsor credit is funded and spent entirely on Solana —
funding is a real devnet SOL transfer into the org's own receive-only wallet
address, spending is a memo transaction proving consumption. Nessie is
untouched by any of this; it's the existing Finance feature (pay a vendor,
receive a payment) and always was.

### Why this line is hard

The platform can move money now (Finance: pay a vendor, receive a payment). If
sponsor credit could become cash, you'd have built a channel for converting
grant money into payouts. That's the fastest way to lose a funder.

Sponsor credit buys platform actions. Full stop.

> Funds platform usage only. Cannot be withdrawn or transferred.

---

## The unit is an action, not an answer

Every action costs inference, so every action is metered.

| Action | Credits |
|---|---|
| Grounded answer (`search_knowledge` finds something) | 1 |
| Task created | 1 |
| Meeting scheduled | 2 |
| Email drafted | 2 |
| Refusal (`search_knowledge` finds nothing, no other tool completes) | **0** |
| Failed action | **0** |

Report generation isn't a feature of this app yet, so it isn't metered here —
add it to the cost table in `src/lib/credits/costs.ts` if that ships later.

Nobody pays for a non-answer or a failure. Never show token counts in the UI —
credits only.

---

## Funding: a real devnet SOL transfer

Rate: **0.5 SOL per 1,000 credits** (1 credit = 500,000 lamports).

Each org gets a receive-only devnet keypair the moment its funding link is
created — only the public key is stored (`organizations.wallet_address`);
there's no reason to ever sign with it, since sponsor credit can't be spent
outward. The sponsor page's Fund button moves real devnet SOL from the
platform's treasury keypair to that address (the hackathon-scope stand-in
for a sponsor's own wallet — see cut order) and credits `credit_balance` by
`lamports_transferred / 500,000`.

---

## What the sponsor sees

Not a balance. A record of work:

> **Funded 1.5 devnet SOL**
> 140 questions answered · 22 emails drafted · 60 tasks created · 15 meetings
> scheduled
>
> 31 questions the material couldn't answer

The last line is the point. It turns a receipt into a funding signal: this
workspace needs more material, not just more credit.

---

## Surfaces

**Admin** — Settings → Sponsorship
Balance shown as capacity, not currency: *"≈ 380 actions left."*
One button: **Get a funding link.**

**Sponsor** — `/sponsor/[slug]` — public, no login required to view
Org name, work funded by action type, refusal count, live ledger, Fund button.
This page is the feature.

**Member** — nothing.
No balance, no cost, no "3 actions left." The moment someone feels metered
they stop using the workspace.

---

## Schema

```sql
-- organizations (this codebase's "workspace")
wallet_address   text     -- receive-only devnet pubkey, set at funding-link creation
credit_balance   bigint default 0   -- credit units. NOT lamports, NOT money.
sponsor_slug     text unique

create table usage_events (
  id                uuid primary key,
  organization_id   uuid references organizations(id),
  action            text,   -- answer | task | meeting | email
  outcome           text,   -- completed | refused | failed
  credits           int default 0,
  tx_sig            text,
  created_at        timestamptz default now()
);
```

`nessie_connections` and `receipts` (the org-money rail) are untouched by any
of this — separate tables, separate code path, as designed.

---

## Flow

1. Sponsor funds at `/sponsor/[slug]` → real devnet SOL transfer to the org's
   `wallet_address` → `credit_balance` credited
2. Member asks for something in chat
3. The chat route resolves it as normal (tools, retrieval, generation)
4. Each chargeable action in that turn writes its own `usage_event` —
   `outcome='completed'` and its listed credit cost, or `outcome='refused'`
   / `'failed'` at zero cost
5. Settle on-chain in batches (every N unsettled events) → one Solana devnet
   memo transaction naming the org, the count per action/outcome, and the
   total credits — `tx_sig` stored back onto every event in the batch

Debit locally, settle asynchronously — the chat path never waits on
confirmation beyond its own batch's memo tx.

### Zero balance

Never interrupt work in flight. A negative `credit_balance` is a funding
signal for the admin and sponsor page, not a stop condition for members —
cutting someone off mid-task is the cruelest version of this feature.

---

## Privacy

**On-chain:** amounts, organization IDs, action/outcome counts, a batch
timestamp.
**Never on-chain:** member identity, message content, recipient addresses, or
anything linking a person to a topic.

On-chain is permanent and cannot be erased. A public record of which member
asked about which subject is the one thing this must not become.

Hold the ability to verify, not to read.

---

## Cut order

1. On-chain batching → debit locally, settle once before demo
2. The sponsor-side wallet → the treasury keypair standing in for a real
   sponsor wallet is already the hackathon-scope choice; a real wallet-connect
   flow is out of scope
3. Nessie → not on this rail at all; cutting it only affects Finance, a
   separate feature

**Last to cut:** the public sponsor page.

---

## Env

```
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_TREASURY_KEYPAIR=
NESSIE_API_KEY=
LAMPORTS_PER_CREDIT=500000
```

Devnet and Nessie sandbox only. No real funds.
