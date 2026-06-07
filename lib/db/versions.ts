import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Append an immutable version snapshot for a node (or the plan when nodeId is
 * null). version_number is per-plan and monotonically increasing.
 */
export async function snapshotNode(
  supabase: SupabaseClient,
  params: {
    planId: string;
    ownerId: string;
    nodeId: string | null;
    snapshot: unknown;
    reason: string;
  },
) {
  const { count } = await supabase
    .from("plan_versions")
    .select("id", { count: "exact", head: true })
    .eq("plan_id", params.planId);

  await supabase.from("plan_versions").insert({
    plan_id: params.planId,
    owner_id: params.ownerId,
    node_id: params.nodeId,
    version_number: (count ?? 0) + 1,
    snapshot: params.snapshot,
    reason: params.reason,
  });
}
