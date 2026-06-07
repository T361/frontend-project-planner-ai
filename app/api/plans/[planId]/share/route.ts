import { requireUser } from "@/lib/auth";
import { ok, fail, handler } from "@/lib/api";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ planId: string }> };

/** Create a read-only share link for a plan the caller owns. */
export const POST = handler(async (req: Request, ctx: Ctx) => {
  const { supabase, user } = await requireUser();
  const { planId } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  // Confirm ownership (RLS would also block, but fail clearly).
  const { data: plan } = await supabase
    .from("plans")
    .select("id")
    .eq("id", planId)
    .single();
  if (!plan) return fail(404, "Plan not found");

  const token = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "");
  const expiresAt =
    typeof body?.expiresInDays === "number" && body.expiresInDays > 0
      ? new Date(Date.now() + body.expiresInDays * 864e5).toISOString()
      : null;

  const { data: link, error } = await supabase
    .from("share_links")
    .insert({
      plan_id: planId,
      owner_id: user.id,
      token,
      is_active: true,
      expires_at: expiresAt,
    })
    .select()
    .single();
  if (error || !link) return fail(500, "Could not create share link");

  const base = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  return ok({ token, url: `${base}/share/${token}`, link });
});

/** List the plan's share links. */
export const GET = handler(async (_req: Request, ctx: Ctx) => {
  const { supabase } = await requireUser();
  const { planId } = await ctx.params;
  const { data } = await supabase
    .from("share_links")
    .select("*")
    .eq("plan_id", planId)
    .order("created_at", { ascending: false });
  return ok({ links: data ?? [] });
});

/** Deactivate a share link (?token=...). */
export const DELETE = handler(async (req: Request, ctx: Ctx) => {
  const { supabase } = await requireUser();
  const { planId } = await ctx.params;
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return fail(400, "token required");
  const { error } = await supabase
    .from("share_links")
    .update({ is_active: false })
    .eq("plan_id", planId)
    .eq("token", token);
  if (error) return fail(500, "Could not revoke link");
  return ok({ revoked: token });
});
