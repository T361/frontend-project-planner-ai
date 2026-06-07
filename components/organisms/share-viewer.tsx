"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";
import { Logo } from "@/components/atoms/logo";
import { PlanTree } from "@/components/organisms/plan-tree";
import { NodeContentView } from "@/components/organisms/node-content-view";
import { StatusBadge } from "@/components/atoms/status-badge";
import type { ClientNode, ClientPlan } from "@/features/planner/types";

/** Organism: read-only public plan viewer (no actions, no owner data). */
export function ShareViewer({
  plan,
  nodes,
}: {
  plan: ClientPlan;
  nodes: ClientNode[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(nodes[0]?.id ?? null);
  const selected = nodes.find((n) => n.id === selectedId) ?? null;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="glass sticky top-0 z-40 border-b border-white/10">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5">
          <Link href="/"><Logo /></Link>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground">
            <Eye className="h-3.5 w-3.5" /> Read-only shared plan
          </span>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-5 py-4">
        <div className="border-b border-white/10 pb-3">
          <h1 className="text-xl font-semibold">{plan.title}</h1>
          <p className="text-sm text-muted-foreground">{plan.brief}</p>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 pt-4 lg:grid-cols-[260px_1fr]">
          <div className="rounded-xl border border-white/10 bg-card/40 p-3">
            <PlanTree nodes={nodes} selectedId={selectedId} onSelect={setSelectedId} />
          </div>
          <div className="rounded-xl border border-white/10 bg-card/40 p-4">
            {selected ? (
              <>
                <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                  <h2 className="text-lg font-semibold">{selected.title}</h2>
                  <StatusBadge status={selected.status} />
                  {selected.route_path && (
                    <span className="font-mono text-xs text-muted-foreground">{selected.route_path}</span>
                  )}
                </div>
                <div className="py-3">
                  {selected.expanded ? (
                    <NodeContentView content={selected.content ?? {}} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {(selected.content?.purpose as string) || "Not expanded."}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Empty plan.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
