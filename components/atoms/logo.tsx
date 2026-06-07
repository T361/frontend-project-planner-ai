import { cn } from "@/lib/utils";

/** Atom: the product wordmark + glyph. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 font-semibold", className)}>
      <span className="relative flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/40">
        <span className="h-2.5 w-2.5 rounded-[3px] bg-primary shadow-[0_0_12px_2px] shadow-primary/60" />
      </span>
      <span className="tracking-tight">
        Frontend<span className="text-primary">Planner</span>
      </span>
    </span>
  );
}
