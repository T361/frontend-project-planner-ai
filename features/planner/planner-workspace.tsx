"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { PlanTree } from "@/components/organisms/plan-tree";
import { NodeInspector, type InspectorAction } from "@/components/organisms/node-inspector";
import { CoherencePanel } from "@/components/organisms/coherence-panel";
import { ExportMenu } from "@/features/export/export-menu";
import { RegenerateDialog } from "./regenerate-dialog";
import { EditNodeDialog, type NodeEdit } from "./edit-node-dialog";
import type { ClientNode, ClientPlan } from "./types";

/**
 * Template + controller: owns the plan-tree state and orchestrates every node
 * action (expand / accept / reject / regenerate / edit / delete) against the API,
 * updating the tree in place so it never falls apart on a single change.
 */
export function PlannerWorkspace({
  plan,
  initialNodes,
}: {
  plan: ClientPlan;
  initialNodes: ClientNode[];
}) {
  const [nodes, setNodes] = useState<ClientNode[]>(initialNodes);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialNodes[0]?.id ?? null,
  );
  const [busy, setBusy] = useState<InspectorAction | null>(null);
  const [regenOpen, setRegenOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const selected = nodes.find((n) => n.id === selectedId) ?? null;

  function replace(updated: ClientNode) {
    setNodes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
  }

  async function call<T>(
    url: string,
    init: RequestInit,
    action: InspectorAction,
  ): Promise<T | null> {
    setBusy(action);
    try {
      const res = await fetch(url, init);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      return data as T;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed");
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function expand() {
    if (!selected) return;
    const force = selected.expanded ? "?force=1" : "";
    const data = await call<{ node: ClientNode; cached: boolean }>(
      `/api/nodes/${selected.id}/expand${force}`,
      { method: "POST" },
      "expand",
    );
    if (data) {
      replace(data.node);
      toast.success(data.cached ? "Loaded cached expansion" : "Page expanded");
    }
  }

  async function setStatus(status: "accepted" | "rejected", action: InspectorAction) {
    if (!selected) return;
    const body: Record<string, unknown> = { status };
    if (status === "rejected") {
      const reason = window.prompt("Optional: why reject this node?") ?? "";
      if (reason) body.rejectionReason = reason;
    }
    const data = await call<{ node: ClientNode }>(
      `/api/nodes/${selected.id}`,
      { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) },
      action,
    );
    if (data) {
      replace(data.node);
      toast.success(status === "accepted" ? "Accepted" : "Rejected");
    }
  }

  async function regenerate(instruction: string) {
    if (!selected) return;
    const data = await call<{
      node: ClientNode;
      changedFields: string[];
      staleDependents: string[];
      rationale: string;
    }>(
      `/api/nodes/${selected.id}/regenerate`,
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ instruction }) },
      "regenerate",
    );
    if (data) {
      replace(data.node);
      setRegenOpen(false);
      // Reflect any flagged stale dependents in the local tree.
      if (data.staleDependents.length) {
        setNodes((prev) =>
          prev.map((n) =>
            data.staleDependents.includes(n.title) && n.id !== data.node.id
              ? { ...n, status: "stale_dependency" }
              : n,
          ),
        );
      }
      toast.success(
        `Regenerated${data.changedFields.length ? ` · changed: ${data.changedFields.join(", ")}` : ""}`,
      );
    }
  }

  async function saveEdit(edit: NodeEdit) {
    if (!selected) return;
    const data = await call<{ node: ClientNode }>(
      `/api/nodes/${selected.id}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: edit.title,
          routePath: edit.routePath,
          content: { purpose: edit.purpose },
        }),
      },
      "edit",
    );
    if (data) {
      replace(data.node);
      setEditOpen(false);
      toast.success("Saved");
    }
  }

  async function remove() {
    if (!selected) return;
    if (!confirm(`Delete "${selected.title}"? Dependents will be flagged stale.`)) return;
    const data = await call<{ deleted: string; flaggedStale: string[] }>(
      `/api/nodes/${selected.id}`,
      { method: "DELETE" },
      "delete",
    );
    if (data) {
      setNodes((prev) => {
        const next = prev
          .filter((n) => n.id !== data.deleted)
          .map((n) =>
            data.flaggedStale.includes(n.id)
              ? { ...n, status: "stale_dependency" as const }
              : n,
          );
        setSelectedId(next[0]?.id ?? null);
        return next;
      });
      toast.success("Node deleted");
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-7xl flex-col px-5 py-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate font-semibold">{plan.title}</h1>
            <p className="truncate text-xs text-muted-foreground">{plan.brief}</p>
          </div>
        </div>
        <ExportMenu planId={plan.id} />
      </div>

      {/* Workspace */}
      <div className="grid min-h-0 flex-1 gap-4 pt-4 lg:grid-cols-[260px_1fr_280px]">
        <div className="min-h-0 rounded-xl border border-white/10 bg-card/40 p-3">
          <PlanTree nodes={nodes} selectedId={selectedId} onSelect={setSelectedId} />
        </div>

        <div className="min-h-0 rounded-xl border border-white/10 bg-card/40 p-4">
          <NodeInspector
            node={selected}
            busy={busy}
            onExpand={expand}
            onAccept={() => setStatus("accepted", "accept")}
            onReject={() => setStatus("rejected", "reject")}
            onRegenerate={() => setRegenOpen(true)}
            onEdit={() => setEditOpen(true)}
            onDelete={remove}
          />
        </div>

        <div className="min-h-0 space-y-4 overflow-y-auto">
          <div className="rounded-xl border border-white/10 bg-card/40 p-3">
            <CoherencePanel planId={plan.id} onJump={(id) => setSelectedId(id)} />
          </div>
        </div>
      </div>

      <RegenerateDialog
        open={regenOpen}
        onOpenChange={setRegenOpen}
        onConfirm={regenerate}
        pending={busy === "regenerate"}
      />
      <EditNodeDialog
        node={selected}
        open={editOpen}
        onOpenChange={setEditOpen}
        onConfirm={saveEdit}
        pending={busy === "edit"}
      />
    </div>
  );
}
