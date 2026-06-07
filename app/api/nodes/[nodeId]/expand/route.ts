import { requireUser } from "@/lib/auth";
import { ok, fail, handler } from "@/lib/api";
import { nodeContentSchema } from "@/lib/validators/node";
import { callStructured, LLMError } from "@/lib/llm/client";
import { expandNodePrompt } from "@/lib/llm/prompts";
import { logLLMEvent } from "@/lib/llm/log";
import { snapshotNode } from "@/lib/db/versions";
import type { RouteSummary } from "@/lib/validators/plan";

export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: Promise<{ nodeId: string }> };

export const POST = handler(async (req: Request, ctx: Ctx) => {
  const { supabase, user } = await requireUser();
  const { nodeId } = await ctx.params;
  const force = new URL(req.url).searchParams.get("force") === "1";

  const { data: node } = await supabase
    .from("plan_nodes")
    .select("*")
    .eq("id", nodeId)
    .single();
  if (!node) return fail(404, "Node not found");

  if (node.expanded && !force) return ok({ node, cached: true });

  const { data: plan } = await supabase
    .from("plans")
    .select("*")
    .eq("id", node.plan_id)
    .single();
  if (!plan) return fail(404, "Plan not found");

  const { data: siblings } = await supabase
    .from("plan_nodes")
    .select("title, route_path")
    .eq("plan_id", node.plan_id)
    .neq("id", nodeId);

  const route: RouteSummary = {
    title: node.title,
    routePath: node.route_path ?? "",
    purpose: node.content?.purpose ?? "",
    primaryUsers: node.content?.primaryUsers ?? [],
    requiredData: node.content?.requiredData ?? [],
    initialDependencies: node.content?.initialDependencies ?? [],
  };

  let content, usage;
  try {
    const result = await callStructured(
      nodeContentSchema,
      expandNodePrompt(
        {
          title: plan.title,
          summary: plan.plan_summary?.summary ?? plan.brief,
          targetFramework: plan.target_framework,
        },
        route,
        (siblings ?? []).map((s) => ({
          title: s.title,
          routePath: s.route_path ?? null,
        })),
      ),
      { temperature: 0.4, maxTokens: 6000 },
    );
    content = result.data;
    usage = result.usage;
  } catch (e) {
    if (e instanceof LLMError)
      await logLLMEvent(supabase, {
        ownerId: user.id,
        planId: node.plan_id,
        nodeId,
        operation: "expand_node",
        usage: e.usage,
        success: false,
        error: e.message,
      });
    throw e;
  }

  const { data: updated, error: updErr } = await supabase
    .from("plan_nodes")
    .update({
      content,
      expanded: true,
      status: node.status === "accepted" ? "accepted" : "needs_review",
    })
    .eq("id", nodeId)
    .select()
    .single();
  if (updErr || !updated) return fail(500, "Could not save expansion");

  await snapshotNode(supabase, {
    planId: node.plan_id,
    ownerId: user.id,
    nodeId,
    snapshot: content,
    reason: force ? "re-expand" : "expand",
  });

  await logLLMEvent(supabase, {
    ownerId: user.id,
    planId: node.plan_id,
    nodeId,
    operation: "expand_node",
    usage,
    success: true,
  });

  return ok({ node: updated, cached: false });
});
