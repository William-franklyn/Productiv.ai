import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Backboard.io — cross-session memory for the assistant. One Backboard
// "assistant" per iRABU organization, created lazily on first use, so
// memory is shared across every member and conversation in that org (same
// scope as everything else in the app). Writes go through the direct
// POST /memories endpoint rather than the Auto-extraction chat pipeline:
// extraction there is tied to Backboard's own billed LLM completion and
// silently no-ops when send_to_llm is false, whereas a direct write is free,
// synchronous, and instantly searchable — verified empirically.
const API_BASE = "https://app.backboard.io/api";

interface BackboardMemory {
  id: string;
  content: string;
  score?: number | null;
  created_at: string;
}

function apiKey(): string | null {
  return process.env.BACKBOARD_API_KEY || null;
}

export function isBackboardConfigured(): boolean {
  return Boolean(apiKey());
}

async function backboardFetch(path: string, init: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "X-API-Key": apiKey()!,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
}

export async function getOrCreateAssistantId(
  supabase: SupabaseClient,
  orgId: string,
  orgName: string,
): Promise<string | null> {
  if (!isBackboardConfigured()) return null;

  const { data: org } = await supabase
    .from("organizations")
    .select("backboard_assistant_id")
    .eq("id", orgId)
    .single();

  if (org?.backboard_assistant_id) return org.backboard_assistant_id;

  try {
    const res = await backboardFetch("/assistants", {
      method: "POST",
      body: JSON.stringify({ name: `iRABU — ${orgName}` }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { assistant_id: string };

    await supabase
      .from("organizations")
      .update({ backboard_assistant_id: body.assistant_id })
      .eq("id", orgId);

    return body.assistant_id;
  } catch {
    return null;
  }
}

export async function searchMemories(
  assistantId: string,
  query: string,
  limit = 5,
): Promise<BackboardMemory[]> {
  try {
    const res = await backboardFetch(`/assistants/${assistantId}/memories/search`, {
      method: "POST",
      body: JSON.stringify({ query, limit }),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { memories: BackboardMemory[] };
    return body.memories ?? [];
  } catch {
    return [];
  }
}

export async function writeMemory(assistantId: string, content: string): Promise<void> {
  try {
    await backboardFetch(`/assistants/${assistantId}/memories`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  } catch {
    // Best-effort — a dropped memory write should never break the chat turn.
  }
}
