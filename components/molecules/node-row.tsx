"use client";

import { cn } from "@/lib/utils";
import { NodeTypeIcon } from "@/components/atoms/node-type-icon";
import { StatusBadge } from "@/components/atoms/status-badge";
import { Circle, CheckCircle2 } from "lucide-react";
import type { ClientNode } from "@/features/planner/types";

/** Molecule: one selectable row in the plan tree. */
export function NodeRow({
  node,
  selected,
  onSelect,
}: {
  node: ClientNode;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(node.id)}
      className={cn(
        "group flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left text-sm transition-colors",
        selected
          ? "border-primary/40 bg-primary/10"
          : "border-transparent hover:border-white/10 hover:bg-white/[0.03]",
      )}
    >
      <NodeTypeIcon
        type={node.node_type}
        className={cn(
          "shrink-0",
          selected ? "text-primary" : "text-muted-foreground",
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{node.title}</span>
        {node.route_path && (
          <span className="block truncate font-mono text-[11px] text-muted-foreground">
            {node.route_path}
          </span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        <StatusBadge status={node.status} />
        {node.expanded ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400/70" />
        ) : (
          <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />
        )}
      </span>
    </button>
  );
}
