import { requireUser } from "@/lib/auth";
import { ok, fail, handler } from "@/lib/api";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ planId: string }> };

/** Delete a plan (cascades to nodes, versions, deps, share links via FKs). */
export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  const { supabase } = await requireUser();
  const { planId } = await ctx.params;
  const { error } = await supabase.from("plans").delete().eq("id", planId);
  if (error) return fail(500, "Could not delete plan");
  return ok({ deleted: planId });
});
