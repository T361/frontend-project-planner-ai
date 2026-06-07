import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ShareViewer } from "@/components/organisms/share-viewer";
import { SAMPLE_PLAN } from "@/lib/sample-plan";
import type { ClientNode, ClientPlan } from "@/features/planner/types";

export const dynamic = "force-dynamic";

/**
 * Public, read-only plan view. The built-in "sample" token renders the bundled
 * Kubernetes console plan (no DB needed). Any other token is resolved through the
 * get_shared_plan SECURITY DEFINER RPC, which only returns active, unexpired
 * links and strips owner_id — anon has no direct table access.
 */
export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (token === "sample") {
    return <ShareViewer plan={SAMPLE_PLAN.plan} nodes={SAMPLE_PLAN.nodes} />;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_shared_plan", {
    p_token: token,
  });
  if (error || !data) notFound();

  const payload = data as {
    plan: ClientPlan;
    nodes: ClientNode[];
  };
  if (!payload.plan) notFound();

  return <ShareViewer plan={payload.plan} nodes={payload.nodes ?? []} />;
}
