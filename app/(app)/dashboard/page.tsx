import { createClient } from "@/lib/supabase/server";
import { BriefComposer } from "@/features/planner/brief-composer";
import {
  DashboardPlanGrid,
  type PlanCard,
} from "@/components/organisms/dashboard-plan-grid";
import { UsageMeter, type UsageTotals } from "@/features/usage/usage-meter";
import { SectionLabel } from "@/components/atoms/section-label";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: plans }, { data: nodes }, { data: events }] = await Promise.all([
    supabase.from("plans").select("*").order("updated_at", { ascending: false }),
    supabase.from("plan_nodes").select("plan_id"),
    supabase
      .from("llm_events")
      .select("input_tokens, output_tokens, cost_estimate, latency_ms"),
  ]);

  const counts = new Map<string, number>();
  for (const n of nodes ?? [])
    counts.set(n.plan_id, (counts.get(n.plan_id) ?? 0) + 1);

  const cards: PlanCard[] = (plans ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    brief: p.brief,
    target_framework: p.target_framework,
    status: p.status,
    updated_at: p.updated_at,
    nodeCount: counts.get(p.id) ?? 0,
  }));

  const ev = events ?? [];
  const totals: UsageTotals = {
    calls: ev.length,
    inputTokens: ev.reduce((s, e) => s + (e.input_tokens ?? 0), 0),
    outputTokens: ev.reduce((s, e) => s + (e.output_tokens ?? 0), 0),
    cost: ev.reduce((s, e) => s + Number(e.cost_estimate ?? 0), 0),
    avgLatencyMs: ev.length
      ? ev.reduce((s, e) => s + (e.latency_ms ?? 0), 0) / ev.length
      : 0,
  };

  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New plan</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Describe an app in plain English and get a route-level plan tree to
            drill into.
          </p>
          <div className="mt-5">
            <BriefComposer />
          </div>

          <div className="mt-10">
            <SectionLabel>Your plans</SectionLabel>
            <div className="mt-4">
              <DashboardPlanGrid plans={cards} />
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <SectionLabel>LLM usage</SectionLabel>
          <UsageMeter totals={totals} />
          <div className="rounded-lg border border-white/10 bg-card/40 p-4 text-xs text-muted-foreground">
            Generation is lazy — only the route tree is created up front. Expanding
            a node is a separate, cheaper call. All usage is tracked per plan.
          </div>
        </aside>
      </div>
    </main>
  );
}
