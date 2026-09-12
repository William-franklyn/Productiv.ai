import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function logActivity(
  supabase: SupabaseClient,
  params: { organizationId: string; actorId: string | null; action: string; detail: string },
) {
  await supabase.from("activity_log").insert({
    organization_id: params.organizationId,
    actor_id: params.actorId,
    action: params.action,
    detail: params.detail,
  });
}
