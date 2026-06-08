import { Activity, Coins, Gauge, Timer } from "lucide-react";

export type UsageTotals = {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  avgLatencyMs: number;
};

/** Molecule: compact LLM usage/cost readout with refined numeric typography. */
export function UsageMeter({ totals }: { totals: UsageTotals }) {
  const items = [
    { icon: Coins, label: "Est. cost", value: `$${totals.cost.toFixed(4)}`, accent: true },
    { icon: Activity, label: "LLM calls", value: totals.calls.toLocaleString() },
    {
      icon: Gauge,
      label: "Tokens",
      value: (totals.inputTokens + totals.outputTokens).toLocaleString(),
    },
    {
      icon: Timer,
      label: "Avg latency",
      value: `${Math.round(totals.avgLatencyMs)}ms`,
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((it) => (
        <div
          key={it.label}
          className="card-glow group rounded-lg border border-white/10 bg-card/50 p-3"
        >
          <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            <it.icon className="h-3.5 w-3.5 text-primary/70 transition-transform duration-300 group-hover:scale-110" />
            {it.label}
          </div>
          <div
            className={`mt-1.5 font-mono text-xl font-semibold tabular-nums tracking-tight ${
              it.accent ? "text-gradient-blue" : "text-foreground"
            }`}
          >
            {it.value}
          </div>
        </div>
      ))}
    </div>
  );
}
