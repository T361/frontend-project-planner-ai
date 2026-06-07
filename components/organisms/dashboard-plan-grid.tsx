"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, ArrowUpRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { StatusBadge } from "@/components/atoms/status-badge";

export type PlanCard = {
  id: string;
  title: string;
  brief: string;
  target_framework: string;
  status: string;
  updated_at: string;
  nodeCount: number;
};

/** Organism: grid of the user's saved plans with open + delete. */
export function DashboardPlanGrid({ plans }: { plans: PlanCard[] }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  async function remove(id: string) {
    if (!confirm("Delete this plan and all its nodes? This cannot be undone."))
      return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/plans/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Plan deleted");
      router.refresh();
    } catch {
      toast.error("Could not delete plan");
    } finally {
      setDeleting(null);
    }
  }

  if (!plans.length) {
    return (
      <div className="rounded-xl border border-dashed border-white/12 bg-card/30 p-10 text-center text-sm text-muted-foreground">
        No plans yet. Describe an app above to generate your first plan tree.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {plans.map((p) => (
        <div
          key={p.id}
          className="group relative flex flex-col rounded-xl border border-white/10 bg-card/60 p-4 transition-colors hover:border-white/20"
        >
          <div className="flex items-start justify-between gap-2">
            <Link href={`/plans/${p.id}`} className="min-w-0 flex-1">
              <h3 className="truncate font-medium group-hover:text-primary">
                {p.title}
              </h3>
            </Link>
            <button
              onClick={() => remove(p.id)}
              disabled={deleting === p.id}
              aria-label="Delete plan"
              className="text-muted-foreground/60 hover:text-red-400 disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
            {p.brief}
          </p>
          <div className="mt-auto flex items-center justify-between pt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <StatusBadge status={p.status === "generated" ? "draft" : p.status} />
              <span>{p.nodeCount} routes</span>
            </span>
            <span>{formatDistanceToNow(new Date(p.updated_at))} ago</span>
          </div>
          <Link
            href={`/plans/${p.id}`}
            className="absolute right-4 top-12 opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden
          >
            <ArrowUpRight className="h-4 w-4 text-primary" />
          </Link>
        </div>
      ))}
    </div>
  );
}
