import { requireUser } from "@/lib/auth";
import { ok, fail, handler } from "@/lib/api";
import { regenerateOutputSchema } from "@/lib/validators/node";
import { callStructured, LLMError } from "@/lib/llm/client";
import { regenerateNodePrompt } from "@/lib/llm/prompts";
import { logLLMEvent } from "@/lib/llm/log";
import { snapshotNode } from "@/lib/db/versions";

export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: Promise<{ nodeId: string }> };

export const POST = handler(async (req: Request, ctx: Ctx) => {
  const { supabase, user } = await requireUser();
  const { nodeId } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const instruction: string = typeof body?.instruction === "string" ? body.instruction : "";

  const { data: node } = await supabase
    .from("plan_nodes")
    .select("*")
    .eq("id", nodeId)
    .single();
  if (!node) return fail(404, "Node not found");

  const { data: plan } = await supabase
    .from("plans")
    .select("*")
    .eq("id", node.plan_id)
    .single();
  if (!plan) return fail(404, "Plan not found");

  // Constrained context only: dependents that point at this node.
  const { data: deps } = await supabase
    .from("node_dependencies")
    .select("dependency_type, reason, source_node_id")
    .eq("target_node_id", nodeId);
  const dependencyContext = (deps ?? [])
    .map((d) => `- ${d.dependency_type}: ${d.reason ?? ""}`)
    .join("\n");

  let result, usage;
  try {
    const r = await callStructured(
      regenerateOutputSchema,
      regenerateNodePrompt(
        {
          title: plan.title,
          summary: plan.plan_summary?.summary ?? plan.brief,
          targetFramework: plan.target_framework,
        },
        { title: node.title, routePath: node.route_path },
        node.content ?? {},
        instruction,
        dependencyContext,
      ),
      { temperature: 0.5, maxTokens: 6000 },
    );
    result = r.data;
    usage = r.usage;
  } catch (e) {
    if (e instanceof LLMError)
      await logLLMEvent(supabase, {
        ownerId: user.id,
        planId: node.plan_id,
        nodeId,
        operation: "regenerate_node",
        usage: e.usage,
        success: false,
        error: e.message,
      });
    throw e;
  }

  const { data: updated, error: updErr } = await supabase
    .from("plan_nodes")
    .update({ content: result.content, expanded: true, status: "regenerated" })
    .eq("id", nodeId)
    .select()
    .single();
  if (updErr || !updated) return fail(500, "Could not save regeneration");

  // If the model says dependents may now be stale, flag those edges.
  if (result.staleDependents.length) {
    await supabase
      .from("node_dependencies")
      .update({ status: "stale", reason: "target regenerated" })
      .eq("target_node_id", nodeId);
  }

  await snapshotNode(supabase, {
    planId: node.plan_id,
    ownerId: user.id,
    nodeId,
    snapshot: result.content,
    reason: `regenerate: ${result.rationale || instruction}`.slice(0, 280),
  });

  await logLLMEvent(supabase, {
    ownerId: user.id,
    planId: node.plan_id,
    nodeId,
    operation: "regenerate_node",
    usage,
    success: true,
  });

  return ok({
    node: updated,
    changedFields: result.changedFields,
    newDependencies: result.newDependencies,
    staleDependents: result.staleDependents,
    rationale: result.rationale,
  });
});
