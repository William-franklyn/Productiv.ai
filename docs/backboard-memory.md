# Cross-session chat memory (Backboard.io)

The assistant remembers facts across conversations, not just within one. Ask
it something in one chat, start a brand-new conversation days later, and it
still knows.

## Scope

One Backboard "assistant" per iRABU organization — created lazily on
that org's first chat message and cached on `organizations.backboard_assistant_id`
(migration `025_backboard_memory.sql`). Memory is shared across every member
and every conversation in the org, matching how the rest of the app scopes
data. There's no per-user or per-conversation memory boundary.

## How a turn works

`src/app/api/assistant/chat/route.ts`, per request:

1. **Before the model runs:** search the org's Backboard memory using the
   latest user message as the query (`searchMemories`), and inject any hits
   into the system prompt as a "relevant memory" block. The prompt tells the
   model to use it silently — never to say "according to my memory."
2. **After the model replies (`onFinish`):** write one memory record —
   `Q: {userText}\nA: {assistantText}` — via a direct write (`writeMemory`).

Both steps are best-effort: a Backboard outage or missing API key degrades to
today's behavior (no memory), it never breaks or blocks the chat turn.

## Why a direct write, not Backboard's own extraction

Backboard's `POST /threads/messages` endpoint has an `Auto` memory mode that's
supposed to extract facts from a message as a side effect. Two things ruled
it out empirically:

- **`send_to_llm: false` — meant to let you feed the memory pipeline without
  generating a chat reply — silently skips extraction too.** A test message
  sent with `send_to_llm: false` came back `status: "COMPLETED"` but
  `memory_operation_id: null`, and a follow-up search and a direct
  `GET /memories` list both confirmed nothing was ever stored.
- Sending the same call **without** `send_to_llm: false` (i.e. letting it
  attempt a real reply) did extract memories correctly — even though the
  reply itself failed with a billing error (`"Your free credit is reserved
  for Memory & RAG, so it can't cover LLM chat"`). So extraction rides on
  Backboard's own billed LLM completion, and there's no way to get it for
  free without also paying for a chat reply we'd throw away.

`POST /assistants/{id}/memories` (direct add) sidesteps this entirely: it
stores the given content verbatim, isn't billed as an LLM call, and is
searchable immediately (confirmed by writing, then searching, in the same
script with no delay). We control exactly what gets stored — the raw Q/A
pair — instead of trusting an extraction step we can't get to run reliably.

## Verifying it works

There's no UI for this — it's invisible backend enrichment, not a new
surface. To check it's live: ask the assistant to remember something
specific in one conversation, start a new conversation, and ask about it
without repeating it. If Backboard is unconfigured or down, the second
conversation just won't know — chat itself keeps working normally.

## Env

`BACKBOARD_API_KEY` — optional. Without it, `isBackboardConfigured()` returns
false and the whole feature no-ops.
