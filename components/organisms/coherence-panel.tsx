"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Loader2, AlertTriangle, Info, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CoherenceWarning } from "@/lib/validators/coherence";

const ICON = {
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
} as const;
const TONE = {
  error: "text-red-400 border-red-500/25 bg-red-500/5",
  warning: "text-amber-300 border-amber-500/25 bg-amber-500/5",
  info: "text-blue-300 border-blue-500/20 bg-blue-500/5",
} as const;

/** Organism: runs the plan coherence check and lists warnings (jump to node). */
export function CoherencePanel({
  planId,
  onJump,
}: {
  planId: string;
  onJump: (nodeId: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);
  const [warnings, setWarnings] = useState<CoherenceWarning[]>([]);

  async function run() {
    setLoading(true);
    try {
      const res = await fetch(`/api/plans/${planId}/coherence-check`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ llm: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWarnings(data.warnings);
      setRan(true);
      toast.success(
        data.warnings.length
          ? `${data.warnings.length} issue(s) found`
          : "Plan is coherent",
      );
    } catch {
      toast.error("Coherence check failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button onClick={run} disabled={loading} variant="outline" size="sm" className="w-full gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        Run coherence check
      </Button>

      {ran && warnings.length === 0 && (
        <p className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-xs text-emerald-300">
          No coherence issues detected.
        </p>
      )}

      <div className="space-y-2">
        {warnings.map((w, i) => {
          const Icon = ICON[w.severity];
          return (
            <button
              key={i}
              onClick={() => w.nodeId && onJump(w.nodeId)}
              className={`flex w-full gap-2 rounded-md border p-2.5 text-left text-xs ${TONE[w.severity]} ${w.nodeId ? "hover:brightness-125" : "cursor-default"}`}
            >
              <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                <span className="block">{w.message}</span>
                {w.suggestion && (
                  <span className="mt-1 block text-muted-foreground">{w.suggestion}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
