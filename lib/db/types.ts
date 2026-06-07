import type { NodeContent, NodeStatus } from "@/lib/validators/node";
import type { PlanTree } from "@/lib/validators/plan";

/** Row shapes mirroring the SQL schema in supabase/migrations. */

export type PlanRow = {
  id: string;
  owner_id: string;
  title: string;
  brief: string;
  target_framework: string;
  status: string;
  plan_summary: Partial<PlanTree>;
  created_at: string;
  updated_at: string;
};

export type PlanNodeRow = {
  id: string;
  plan_id: string;
  owner_id: string;
  parent_id: string | null;
  node_type: string;
  title: string;
  route_path: string | null;
  status: NodeStatus;
  depth: number;
  sort_order: number;
  content: Partial<NodeContent> & Record<string, unknown>;
  llm_context: Record<string, unknown>;
  expanded: boolean;
  created_at: string;
  updated_at: string;
};

export type NodeDependencyRow = {
  id: string;
  plan_id: string;
  owner_id: string;
  source_node_id: string;
  target_node_id: string;
  dependency_type: string;
  status: "ok" | "stale" | "broken";
  reason: string | null;
  created_at: string;
};

export type LlmEventRow = {
  id: string;
  plan_id: string | null;
  node_id: string | null;
  owner_id: string;
  provider: string;
  model: string;
  operation: string;
  input_tokens: number;
  output_tokens: number;
  cost_estimate: number;
  latency_ms: number;
  success: boolean;
  error_message: string | null;
  created_at: string;
};

export type ShareLinkRow = {
  id: string;
  plan_id: string;
  owner_id: string;
  token: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
};
