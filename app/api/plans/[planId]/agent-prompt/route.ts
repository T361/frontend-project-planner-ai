import { requireUser } from "@/lib/auth";
import { ok, fail, handler } from "@/lib/api";
import { loadPlanBundle } from "@/lib/db/plan";
import { buildAgentPrompt } from "@/lib/export";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ planId: string }> };

/** Returns a scaffolding prompt ready to paste into Claude Code / Cursor. */
export const GET = handler(async (_req: Request, ctx: Ctx) => {
  const { supabase } = await requireUser();
  const { planId } = await ctx.params;
  const bundle = await loadPlanBundle(supabase, planId);
  if (!bundle) return fail(404, "Plan not found");
  return ok({ prompt: buildAgentPrompt(bundle) });
});
