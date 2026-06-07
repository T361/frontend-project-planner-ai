import { requireUser } from "@/lib/auth";
import { ok, fail, handler } from "@/lib/api";
import {
  coherenceReportSchema,
  type CoherenceWarning,
} from "@/lib/validators/coherence";
import { callStructured } from "@/lib/llm/client";
import { coherencePrompt } from "@/lib/llm/prompts";
import { logLLMEvent } from "@/lib/llm/log";
import { isLLMConfigured } from "@/lib/llm/config";

export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: Promise<{ planId: string }> };

export const POST = handler(async (req: Request, ctx: Ctx) => {
  const { supabase, user } = await requireUser();
  const { planId } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const useLLM = body?.llm !== false;

  const { data: plan } = await supabase
    .from("plans")
    .select("*")
    .eq("id", planId)
    .single();
  if (!plan) return fail(404, "Plan not found");

  const { data: nodes } = await supabase
    .from("plan_nodes")
    .select("*")
    .eq("plan_id", planId)
    .order("sort_order");
  const { data: deps } = await supabase
    .from("node_dependencies")
    .select("*")
    .eq("plan_id", planId);

  const warnings: CoherenceWarning[] = [];

  // --- Deterministic checks ---------------------------------------------
  const globalModels = new Set(
    (plan.plan_summary?.globalDataModels ?? []).map((m) => m.name.toLowerCase()),
  );

  for (const edge of deps ?? []) {
    if (edge.status === "broken" || edge.status === "stale") {
      warnings.push({
        severity: edge.status === "broken" ? "error" : "warning",
        kind: edge.status === "broken" ? "broken_dependency" : "stale_dependency",
        nodeId: edge.source_node_id,
        message: `Dependency is ${edge.status}: ${edge.reason ?? "target changed"}`,
        suggestion: "Review and regenerate the dependent node.",
      });
    }
  }

  for (const n of nodes ?? []) {
    if (n.status === "stale_dependency") {
      warnings.push({
        severity: "warning",
        kind: "stale_dependency",
        nodeId: n.id,
        message: `"${n.title}" references something that was changed or removed.`,
        suggestion: "Regenerate or edit this node to restore coherence.",
      });
    }
    // Route declares required data that maps to no known global model.
    const required: string[] = n.content?.requiredData ?? [];
    for (const r of required) {
      const token = r.toLowerCase();
      const known = [...globalModels].some(
        (m) => token.includes(m) || m.includes(token.split(" ")[0]),
      );
      if (!known && globalModels.size > 0) {
        warnings.push({
          severity: "info",
          kind: "missing_data_model",
          nodeId: n.id,
          message: `"${n.title}" needs "${r}" but no matching global data model is defined.`,
          suggestion: `Add a "${r}" data model or rename to an existing one.`,
        });
      }
    }
  }

  // --- Optional LLM slop / consistency pass ------------------------------
  if (useLLM && isLLMConfigured() && (nodes?.length ?? 0) > 0) {
    const brief = (nodes ?? [])
      .map(
        (n) =>
          `${n.id} | ${n.title} (${n.route_path ?? "-"}) | ${n.status} | needs: ${(n.content?.requiredData ?? []).join(", ") || "-"} | ${n.expanded ? "expanded" : "not expanded"}`,
      )
      .join("\n");
    try {
      const { data, usage } = await callStructured(
        coherenceReportSchema,
        coherencePrompt(
          { title: plan.title, summary: plan.plan_summary?.summary ?? plan.brief },
          brief,
        ),
        { temperature: 0.2, maxTokens: 2000 },
      );
      warnings.push(...data.warnings);
      await logLLMEvent(supabase, {
        ownerId: user.id,
        planId,
        nodeId: null,
        operation: "coherence_check",
        usage,
        success: true,
      });
    } catch {
      // Deterministic warnings are still returned — the LLM pass is best-effort.
    }
  }

  return ok({ warnings });
});
