import { cn } from "@/lib/utils";

/** Atom: a compact label/value stat chip (used in the usage meter + toolbar). */
export function MetricPill({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1",
        className,
      )}
    >
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="font-mono text-xs text-foreground">{value}</span>
    </div>
  );
}
