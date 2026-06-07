import { requireUser } from "@/lib/auth";
import { ok, fail, handler } from "@/lib/api";
import { patchNodeInputSchema } from "@/lib/validators/node";
import { snapshotNode } from "@/lib/db/versions";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ nodeId: string }> };

/** Edit / accept / reject a node. */
export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  const { supabase, user } = await requireUser();
  const { nodeId } = await ctx.params;

  const parsed = patchNodeInputSchema.safeParse(await req.json());
  if (!parsed.success)
    return fail(400, parsed.error.issues[0]?.message ?? "Invalid input");
  const patch = parsed.data;

  const { data: node } = await supabase
    .from("plan_nodes")
    .select("*")
    .eq("id", nodeId)
    .single();
  if (!node) return fail(404, "Node not found");

  const update: Record<string, unknown> = {};
  let contentChanged = false;

  if (patch.title !== undefined) update.title = patch.title;
  if (patch.routePath !== undefined) update.route_path = patch.routePath;
  if (patch.content !== undefined) {
    update.content = { ...(node.content ?? {}), ...patch.content };
    contentChanged = true;
  }

  if (patch.status !== undefined) {
    update.status = patch.status;
    if (patch.status === "rejected" && patch.rejectionReason) {
      update.content = {
        ...(node.content ?? {}),
        ...(patch.content ?? {}),
        rejectionReason: patch.rejectionReason,
      };
    }
  } else if (contentChanged || patch.title !== undefined) {
    update.status = "edited";
  }

  const { data: updated, error } = await supabase
    .from("plan_nodes")
    .update(update)
    .eq("id", nodeId)
    .select()
    .single();
  if (error || !updated) return fail(500, "Could not update node");

  if (contentChanged) {
    await snapshotNode(supabase, {
      planId: node.plan_id,
      ownerId: user.id,
      nodeId,
      snapshot: update.content,
      reason: "manual edit",
    });
  }

  return ok({ node: updated });
});

/** Delete a node; flag any nodes that depended on it as stale. */
export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  const { supabase } = await requireUser();
  const { nodeId } = await ctx.params;

  const { data: node } = await supabase
    .from("plan_nodes")
    .select("id, plan_id")
    .eq("id", nodeId)
    .single();
  if (!node) return fail(404, "Node not found");

  const { data: edges } = await supabase
    .from("node_dependencies")
    .select("source_node_id")
    .eq("target_node_id", nodeId);
  const dependents = (edges ?? []).map((e) => e.source_node_id);

  if (dependents.length) {
    await supabase
      .from("plan_nodes")
      .update({ status: "stale_dependency" })
      .in("id", dependents);
  }

  const { error } = await supabase.from("plan_nodes").delete().eq("id", nodeId);
  if (error) return fail(500, "Could not delete node");

  return ok({ deleted: nodeId, flaggedStale: dependents });
});
