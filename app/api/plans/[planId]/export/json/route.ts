import { requireUser } from "@/lib/auth";
import { fail, handler } from "@/lib/api";
import { loadPlanBundle } from "@/lib/db/plan";
import { buildJsonExport } from "@/lib/export";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ planId: string }> };

export const GET = handler(async (_req: Request, ctx: Ctx) => {
  const { supabase } = await requireUser();
  const { planId } = await ctx.params;
  const bundle = await loadPlanBundle(supabase, planId);
  if (!bundle) return fail(404, "Plan not found");

  const json = JSON.stringify(buildJsonExport(bundle), null, 2);
  return new Response(json, {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="plan-${planId}.json"`,
    },
  });
});
