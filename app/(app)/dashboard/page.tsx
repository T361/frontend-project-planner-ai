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

  // Defensive: a transient query failure should degrade gracefully, never crash
  // the whole dashboard.
  type Row = Record<string, unknown>;
  let plans: Row[] = [];
  let nodes: Row[] = [];
  let events: Row[] = [];
  try {
    const [p, n, e] = await Promise.all([
      supabase.from("plans").select("*").order("updated_at", { ascending: false }),
      supabase.from("plan_nodes").select("plan_id"),
      supabase
        .from("llm_events")
        .select("input_tokens, output_tokens, cost_estimate, latency_ms"),
    ]);
    plans = (p.data as Row[]) ?? [];
    nodes = (n.data as Row[]) ?? [];
    events = (e.data as Row[]) ?? [];
  } catch (err) {
    console.error("[dashboard] load failed", err);
  }

  const counts = new Map<string, number>();
  for (const n of nodes) {
    const pid = String(n.plan_id ?? "");
    counts.set(pid, (counts.get(pid) ?? 0) + 1);
  }

  const cards: PlanCard[] = plans.map((p) => ({
    id: String(p.id),
    title: String(p.title ?? "Untitled"),
    brief: String(p.brief ?? ""),
    target_framework: String(p.target_framework ?? "nextjs"),
    status: String(p.status ?? "draft"),
    updated_at: String(p.updated_at ?? new Date().toISOString()),
    nodeCount: counts.get(String(p.id)) ?? 0,
  }));

  const num = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0)) || 0;
  const totals: UsageTotals = {
    calls: events.length,
    inputTokens: events.reduce((s, e) => s + num(e.input_tokens), 0),
    outputTokens: events.reduce((s, e) => s + num(e.output_tokens), 0),
    cost: events.reduce((s, e) => s + num(e.cost_estimate), 0),
    avgLatencyMs: events.length
      ? events.reduce((s, e) => s + num(e.latency_ms), 0) / events.length
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
