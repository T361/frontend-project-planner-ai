import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadPlanBundle } from "@/lib/db/plan";
import { PlannerWorkspace } from "@/features/planner/planner-workspace";

export const dynamic = "force-dynamic";

export default async function PlanPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const supabase = await createClient();
  const bundle = await loadPlanBundle(supabase, planId);
  if (!bundle) notFound();

  return <PlannerWorkspace plan={bundle.plan} initialNodes={bundle.nodes} />;
}
