# Solana settlement worker (Vultr)

Sponsored-credits usage events settle on Solana in batches of `SETTLE_BATCH_SIZE`
(3) — but that check only runs inside the chat route's `onFinish`, triggered by
chat traffic. If nobody chats again after an org's count sits at 1 or 2, those
events stay unsettled indefinitely: not because anything's broken, just because
nothing ever re-checks the count. A sponsor watching the public ledger sees a
"Settling…" entry that's been stuck for days for no real reason.

This worker is the fix: an external timer, not tied to chat traffic, that
sweeps and settles anything left stale.

## How it works

- `sweepStaleUnsettledUsage()` (`src/lib/solana/settlement.ts`) finds every
  org with an unsettled `usage_events` row older than 5 minutes, and calls
  the existing `settleUnsettledUsage(orgId)` for each. One org's Solana call
  failing doesn't stop the sweep for the rest.
- `POST /api/internal/settle-sweep` calls that function, gated by a bearer
  token (`CRON_SECRET`) — this route isn't behind Supabase auth since it's
  hit from outside the app entirely, not from a signed-in browser.
- The 5-minute age floor means it never fights normal chat-triggered
  batching: fresh events still get to batch together via the threshold-3
  path first. The sweep only mops up what that path never reached.

## Deploying the timer on Vultr

The box does nothing but run `curl` on a schedule — no Node, no Supabase or
Solana SDKs, no secrets beyond the one bearer token. SSH into the instance
and add a crontab entry:

```bash
crontab -e
```

```cron
*/5 * * * * curl -s -X POST https://productiv-ai.vercel.app/api/internal/settle-sweep -H "Authorization: Bearer $CRON_SECRET" >> /var/log/settle-sweep.log 2>&1
```

Put the actual secret in `/etc/environment` or a small `/root/.settle-sweep-env`
file sourced before the crontab line, rather than pasting it inline — same
value as `CRON_SECRET` in this project's `.env.local` / Vercel envs.

## Env

`CRON_SECRET` — required for the route to accept requests. Without it (or
with a mismatched value), `/api/internal/settle-sweep` always returns 401
and the app keeps working exactly as before — chat-triggered batching still
runs, it just loses this safety net for low-traffic stragglers.
