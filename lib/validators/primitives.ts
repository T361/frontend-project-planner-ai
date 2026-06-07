import { z } from "zod";

/**
 * Atomic building blocks shared across plan generation and node expansion.
 * These Zod schemas are the single source of truth — every LLM response is
 * parsed through them, and the TS types are inferred (no duplicate hand types).
 */

export const atomicLevel = z.enum([
  "atom",
  "molecule",
  "organism",
  "template",
]);

export const componentSchema = z.object({
  name: z.string().min(1),
  atomicLevel,
  filePath: z.string().min(1),
  purpose: z.string().min(1),
  // Why it belongs at this atomic level — the anti-slop guard for decomposition.
  reason: z.string().min(1),
  props: z.array(z.string()).default([]),
  dependsOn: z.array(z.string()).default([]),
});

export const hookSchema = z.object({
  name: z.string().min(1),
  filePath: z.string().min(1),
  purpose: z.string().min(1),
  input: z.string().min(1),
  output: z.string().min(1),
  state: z.string().default(""),
});

export const contextSchema = z.object({
  name: z.string().min(1),
  filePath: z.string().min(1),
  responsibility: z.string().min(1),
  provides: z.array(z.string()).default([]),
});

export const dataFieldSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  description: z.string().default(""),
});

export const dataModelSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  fields: z.array(dataFieldSchema).min(1),
});

export const mockRecordSchema = z.object({
  name: z.string().min(1),
  // Free-form realistic sample payload (object or array), kept as JSON.
  sample: z.unknown(),
});

export const assetSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  purpose: z.string().min(1),
});

export const librarySchema = z.object({
  name: z.string().min(1),
  reason: z.string().min(1),
});

export type AtomicLevel = z.infer<typeof atomicLevel>;
export type Component = z.infer<typeof componentSchema>;
export type Hook = z.infer<typeof hookSchema>;
export type Context = z.infer<typeof contextSchema>;
export type DataModel = z.infer<typeof dataModelSchema>;
export type MockRecord = z.infer<typeof mockRecordSchema>;
export type Asset = z.infer<typeof assetSchema>;
export type Library = z.infer<typeof librarySchema>;
