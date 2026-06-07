import { z } from "zod";
import {
  contextSchema,
  dataModelSchema,
  librarySchema,
} from "./primitives";

/**
 * Output of the initial (lazy) plan generation: route/page-level tree + the
 * global layer. We deliberately do NOT generate per-page component detail here —
 * that happens on demand when a node is expanded.
 */

export const routeSummarySchema = z.object({
  title: z.string().min(1),
  routePath: z.string().min(1),
  purpose: z.string().min(1),
  primaryUsers: z.array(z.string()).default([]),
  requiredData: z.array(z.string()).default([]),
  initialDependencies: z.array(z.string()).default([]),
});

export const planTreeSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  targetFramework: z.string().default("nextjs"),
  routes: z.array(routeSummarySchema).min(2),
  globalDataModels: z.array(dataModelSchema).default([]),
  globalContexts: z.array(contextSchema).default([]),
  globalLibraries: z.array(librarySchema).default([]),
  risks: z.array(z.string()).default([]),
});

export const generatePlanInputSchema = z.object({
  brief: z.string().min(8, "Describe the app in a bit more detail").max(4000),
  targetFramework: z
    .enum(["nextjs", "react", "vue"])
    .default("nextjs"),
});

export type RouteSummary = z.infer<typeof routeSummarySchema>;
export type PlanTree = z.infer<typeof planTreeSchema>;
export type GeneratePlanInput = z.infer<typeof generatePlanInputSchema>;
