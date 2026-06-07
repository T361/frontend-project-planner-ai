import { Route, Component, Boxes, Layers, FileCode } from "lucide-react";
import { cn } from "@/lib/utils";

/** Atom: maps a node type to its glyph. Pure icon, no behavior. */
const ICONS: Record<string, typeof Route> = {
  route: Route,
  component: Component,
  organism: Boxes,
  template: Layers,
  default: FileCode,
};

export function NodeTypeIcon({
  type,
  className,
}: {
  type: string;
  className?: string;
}) {
  const Icon = ICONS[type] ?? ICONS.default;
  return <Icon className={cn("h-4 w-4", className)} aria-hidden />;
}
