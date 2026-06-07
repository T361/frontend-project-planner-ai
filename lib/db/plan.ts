import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanRow, PlanNodeRow, NodeDependencyRow } from "./types";

/** Load a plan with its nodes + dependencies (RLS scopes to the owner). */
export async function loadPlanBundle(
  supabase: SupabaseClient,
  planId: string,
): Promise<{
  plan: PlanRow;
  nodes: PlanNodeRow[];
  dependencies: NodeDependencyRow[];
} | null> {
  const { data: plan } = await supabase
    .from("plans")
    .select("*")
    .eq("id", planId)
    .single();
  if (!plan) return null;

  const { data: nodes } = await supabase
    .from("plan_nodes")
    .select("*")
    .eq("plan_id", planId)
    .order("sort_order");

  const { data: dependencies } = await supabase
    .from("node_dependencies")
    .select("*")
    .eq("plan_id", planId);

  return {
    plan: plan as PlanRow,
    nodes: (nodes ?? []) as PlanNodeRow[],
    dependencies: (dependencies ?? []) as NodeDependencyRow[],
  };
}
