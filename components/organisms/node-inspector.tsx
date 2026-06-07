"use client";

import {
  Sparkles,
  Check,
  X,
  RefreshCw,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/atoms/status-badge";
import { NodeContentView } from "@/components/organisms/node-content-view";
import type { ClientNode } from "@/features/planner/types";

export type InspectorAction =
  | "expand"
  | "accept"
  | "reject"
  | "regenerate"
  | "edit"
  | "delete";

/** Organism: the detail pane for the selected node + per-node actions. */
export function NodeInspector({
  node,
  busy,
  onExpand,
  onAccept,
  onReject,
  onRegenerate,
  onEdit,
  onDelete,
}: {
  node: ClientNode | null;
  busy: InspectorAction | null;
  onExpand: () => void;
  onAccept: () => void;
  onReject: () => void;
  onRegenerate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  if (!node) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Select a route to inspect it.
      </div>
    );
  }

  const isExpanding = busy === "expand";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-lg font-semibold">{node.title}</h2>
            <StatusBadge status={node.status} />
          </div>
          {node.route_path && (
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              {node.route_path}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 py-3">
        <Button size="sm" onClick={onExpand} disabled={!!busy} className="gap-1.5">
          {isExpanding ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {node.expanded ? "Re-expand" : "Expand"}
        </Button>
        <Button size="sm" variant="outline" onClick={onAccept} disabled={!!busy} className="gap-1.5">
          {busy === "accept" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Accept
        </Button>
        <Button size="sm" variant="outline" onClick={onReject} disabled={!!busy} className="gap-1.5">
          {busy === "reject" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
          Reject
        </Button>
        <Button size="sm" variant="outline" onClick={onRegenerate} disabled={!!busy} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Regenerate
        </Button>
        <Button size="sm" variant="outline" onClick={onEdit} disabled={!!busy} className="gap-1.5">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete} disabled={!!busy} className="gap-1.5 text-muted-foreground hover:text-red-400">
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {isExpanding ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-28 w-full" />
            <p className="text-xs text-muted-foreground">
              Decomposing this page into atoms, hooks, contexts and data…
            </p>
          </div>
        ) : node.expanded ? (
          <div className="py-2">
            <NodeContentView content={node.content ?? {}} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <p className="max-w-sm text-sm text-muted-foreground">
              {(node.content?.purpose as string) ||
                "This route hasn't been expanded yet."}
            </p>
            <Button onClick={onExpand} className="gap-2">
              <Sparkles className="h-4 w-4" /> Expand this page
            </Button>
            <p className="text-xs text-muted-foreground">
              Lazy generation — components are only created on demand.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
