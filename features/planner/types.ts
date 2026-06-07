import type { PlanNodeRow, PlanRow } from "@/lib/db/types";

/** Client-facing aliases (rows are plain JSON, safe to pass to client). */
export type ClientNode = PlanNodeRow;
export type ClientPlan = PlanRow;
