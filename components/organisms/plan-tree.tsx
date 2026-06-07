"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { NodeRow } from "@/components/molecules/node-row";
import { SectionLabel } from "@/components/atoms/section-label";
import type { ClientNode } from "@/features/planner/types";

/** Organism: the route-level navigator down the left side of the workspace. */
export function PlanTree({
  nodes,
  selectedId,
  onSelect,
}: {
  nodes: ClientNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-1 pb-2">
        <SectionLabel>Routes</SectionLabel>
        <span className="text-[11px] text-muted-foreground">{nodes.length}</span>
      </div>
      <ScrollArea className="flex-1 pr-2">
        <div className="space-y-1">
          {nodes.map((n) => (
            <NodeRow
              key={n.id}
              node={n}
              selected={n.id === selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
