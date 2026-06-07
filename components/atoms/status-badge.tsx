import { cn } from "@/lib/utils";

/**
 * Atom: renders a node's lifecycle status as a colored pill. Indivisible —
 * pure presentation, no layout, no data fetching.
 */
const STYLES: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-white/8 text-muted-foreground border-white/10" },
  accepted: { label: "Accepted", cls: "bg-emerald-500/12 text-emerald-300 border-emerald-500/25" },
  rejected: { label: "Rejected", cls: "bg-red-500/12 text-red-300 border-red-500/25" },
  needs_review: { label: "Needs review", cls: "bg-amber-500/12 text-amber-300 border-amber-500/25" },
  stale_dependency: { label: "Stale", cls: "bg-orange-500/12 text-orange-300 border-orange-500/25" },
  regenerated: { label: "Regenerated", cls: "bg-blue-500/12 text-blue-300 border-blue-500/25" },
  edited: { label: "Edited", cls: "bg-violet-500/12 text-violet-300 border-violet-500/25" },
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const s = STYLES[status] ?? STYLES.draft;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        s.cls,
        className,
      )}
    >
      {s.label}
    </span>
  );
}
