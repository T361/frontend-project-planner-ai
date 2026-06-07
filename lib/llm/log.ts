import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LLMUsage } from "./client";

/**
 * Persist one llm_events row per model call (success or failure). This is the
 * data behind the per-plan usage/cost dashboard. Logging never throws — a
 * telemetry failure must not break the user's request.
 */
export async function logLLMEvent(
  supabase: SupabaseClient,
  params: {
    ownerId: string;
    planId: string | null;
    nodeId: string | null;
    operation: string;
    usage: LLMUsage;
    success: boolean;
    error?: string | null;
  },
) {
  try {
    await supabase.from("llm_events").insert({
      owner_id: params.ownerId,
      plan_id: params.planId,
      node_id: params.nodeId,
      provider: params.usage.provider,
      model: params.usage.model,
      operation: params.operation,
      input_tokens: params.usage.inputTokens,
      output_tokens: params.usage.outputTokens,
      cost_estimate: params.usage.costEstimate,
      latency_ms: params.usage.latencyMs,
      success: params.success,
      error_message: params.error ?? null,
    });
  } catch {
    // swallow — telemetry is best-effort
  }
}
