import { requireUser } from "@/lib/auth";
import { fail, handler } from "@/lib/api";
import { loadPlanBundle } from "@/lib/db/plan";
import { buildMarkdown } from "@/lib/export";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ planId: string }> };

export const GET = handler(async (_req: Request, ctx: Ctx) => {
  const { supabase } = await requireUser();
  const { planId } = await ctx.params;
  const bundle = await loadPlanBundle(supabase, planId);
  if (!bundle) return fail(404, "Plan not found");

  return new Response(buildMarkdown(bundle), {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="plan-${planId}.md"`,
    },
  });
});
