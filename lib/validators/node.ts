import { z } from "zod";
import {
  assetSchema,
  componentSchema,
  contextSchema,
  dataModelSchema,
  hookSchema,
  librarySchema,
  mockRecordSchema,
} from "./primitives";

/**
 * Expanded detail for a single route/page node — produced lazily on "Expand".
 * This is the engineering payload: atoms→organisms, hooks, contexts, data shape,
 * mock data, assets, libraries, edge cases and acceptance criteria.
 */
export const nodeContentSchema = z.object({
  purpose: z.string().min(1),
  primaryUsers: z.array(z.string()).default([]),
  requiredData: z.array(z.string()).default([]),
  atoms: z.array(componentSchema).default([]),
  molecules: z.array(componentSchema).default([]),
  organisms: z.array(componentSchema).default([]),
  templates: z.array(componentSchema).default([]),
  hooks: z.array(hookSchema).default([]),
  contexts: z.array(contextSchema).default([]),
  dataModels: z.array(dataModelSchema).default([]),
  mockData: z.array(mockRecordSchema).default([]),
  assets: z.array(assetSchema).default([]),
  libraries: z.array(librarySchema).default([]),
  edgeCases: z.array(z.string()).default([]),
  acceptanceCriteria: z.array(z.string()).min(1),
});

/** Node statuses tracked in the DB and surfaced as badges in the tree. */
export const nodeStatus = z.enum([
  "draft",
  "accepted",
  "rejected",
  "needs_review",
  "stale_dependency",
  "regenerated",
  "edited",
]);

/** What `regenerateNode` returns: new content + an explicit change report. */
export const regenerateOutputSchema = z.object({
  content: nodeContentSchema,
  changedFields: z.array(z.string()).default([]),
  newDependencies: z.array(z.string()).default([]),
  staleDependents: z.array(z.string()).default([]),
  rationale: z.string().default(""),
});

/** Client → PATCH /api/nodes/[id] : edit title/route/status/content. */
export const patchNodeInputSchema = z.object({
  title: z.string().min(1).optional(),
  routePath: z.string().optional(),
  status: nodeStatus.optional(),
  content: nodeContentSchema.partial().optional(),
  rejectionReason: z.string().optional(),
});

export type NodeContent = z.infer<typeof nodeContentSchema>;
export type NodeStatus = z.infer<typeof nodeStatus>;
export type RegenerateOutput = z.infer<typeof regenerateOutputSchema>;
export type PatchNodeInput = z.infer<typeof patchNodeInputSchema>;
