import { requireUser } from "@/lib/auth";
import { ok, fail, handler } from "@/lib/api";
import { generatePlanInputSchema, planTreeSchema } from "@/lib/validators/plan";
import { callStructured, LLMError } from "@/lib/llm/client";
import { planTreePrompt } from "@/lib/llm/prompts";
import { logLLMEvent } from "@/lib/llm/log";
import { isLLMConfigured } from "@/lib/llm/config";

export const runtime = "nodejs";
export const maxDuration = 60;

export const POST = handler(async (req: Request) => {
  const { supabase, user } = await requireUser();
  if (!isLLMConfigured()) return fail(503, "LLM provider is not configured.");

  const parsed = generatePlanInputSchema.safeParse(await req.json());
  if (!parsed.success)
    return fail(400, parsed.error.issues[0]?.message ?? "Invalid input");
  const { brief, targetFramework } = parsed.data;

  // 1) Generate the route-level tree (lazy — no per-page components yet).
  let tree, usage;
  try {
    const result = await callStructured(
      planTreeSchema,
      planTreePrompt(brief, targetFramework),
      { temperature: 0.5, maxTokens: 4096 },
    );
    tree = result.data;
    usage = result.usage;
  } catch (e) {
    if (e instanceof LLMError)
      await logLLMEvent(supabase, {
        ownerId: user.id,
        planId: null,
        nodeId: null,
        operation: "generate_plan",
        usage: e.usage,
        success: false,
        error: e.message,
      });
    throw e;
  }

  // 2) Persist the plan.
  const { data: plan, error: planErr } = await supabase
    .from("plans")
    .insert({
      owner_id: user.id,
      title: tree.title,
      brief,
      target_framework: targetFramework,
      status: "generated",
      plan_summary: tree,
    })
    .select()
    .single();
  if (planErr || !plan) return fail(500, "Could not save plan");

  // 3) Persist one route node per route (top of the tree).
  const nodeRows = tree.routes.map((r, i) => ({
    plan_id: plan.id,
    owner_id: user.id,
    parent_id: null,
    node_type: "route",
    title: r.title,
    route_path: r.routePath,
    status: "draft",
    depth: 0,
    sort_order: i,
    expanded: false,
    content: {
      purpose: r.purpose,
      primaryUsers: r.primaryUsers,
      requiredData: r.requiredData,
      initialDependencies: r.initialDependencies,
    },
  }));
  const { error: nodesErr } = await supabase.from("plan_nodes").insert(nodeRows);
  if (nodesErr) return fail(500, "Could not save plan nodes");

  await logLLMEvent(supabase, {
    ownerId: user.id,
    planId: plan.id,
    nodeId: null,
    operation: "generate_plan",
    usage,
    success: true,
  });

  return ok({ planId: plan.id });
});
