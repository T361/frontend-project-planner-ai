import { z } from "zod";

/**
 * Coherence check output. Combines deterministic DB checks (broken edges,
 * orphaned references) with an optional LLM pass that flags generic "slop".
 */
export const coherenceWarningSchema = z.object({
  severity: z.enum(["info", "warning", "error"]),
  kind: z.enum([
    "broken_dependency",
    "stale_dependency",
    "missing_data_model",
    "route_data_mismatch",
    "orphaned_component",
    "generic_slop",
    "other",
  ]),
  nodeId: z.string().nullable().default(null),
  message: z.string().min(1),
  suggestion: z.string().default(""),
});

export const coherenceReportSchema = z.object({
  warnings: z.array(coherenceWarningSchema).default([]),
});

export type CoherenceWarning = z.infer<typeof coherenceWarningSchema>;
export type CoherenceReport = z.infer<typeof coherenceReportSchema>;
