import "server-only";
import type { LLMMessage } from "./client";
import type { PlanTree, RouteSummary } from "@/lib/validators/plan";
import type { NodeContent } from "@/lib/validators/node";

/**
 * Prompt library for the planner's own LLM calls. The guiding principle is
 * anti-slop: every prompt demands concrete, file-level, framework-specific
 * output and explicitly bans filler ("modern", "scalable", "Button under every
 * page"). See docs/AI_WORKFLOW.md for how these were tuned.
 */

const ANTI_SLOP = `
HARD RULES (a reviewer will reject vague output):
- Be specific to THIS product. No generic boilerplate that would fit any app.
- Never list a component without a concrete reason it exists AND why it sits at its atomic level.
- Atoms = truly indivisible UI (e.g. StatusBadge, MetricValue, IconButton). Molecules = small compositions (e.g. SearchBar, FilterChipGroup, KpiCard). Organisms = page-defining sections (e.g. WorkloadTable, DeploymentTimeline, BillingUsageChart). Templates = layout scaffolds.
- Do NOT put "Button" under every page. Only list a component if the page genuinely needs it.
- Every hook states its input and output. Every context states what it provides. Every data model has typed fields. Mock data must be realistic and nested where appropriate.
- Only include a library if it earns its place; give the reason.
- Banned filler words unless immediately followed by a concrete spec: "modern", "scalable", "user-friendly", "seamless", "robust", "powerful".
- Output MUST be a single valid JSON object. No markdown, no commentary, no trailing text.`;

export function planTreePrompt(
  brief: string,
  framework: string,
): LLMMessage[] {
  return [
    {
      role: "system",
      content:
        `You are a principal frontend architect. Given a vague product brief, you produce the ` +
        `ROUTE/PAGE-level plan for a ${framework} App Router application, plus the global layer ` +
        `(shared data models, contexts, libraries) and real delivery risks. ` +
        `You do NOT expand per-page components yet — that is done lazily later.` +
        ANTI_SLOP,
    },
    {
      role: "user",
      content: `Product brief: """${brief}"""

Return JSON with this exact shape:
{
  "title": "short product name",
  "summary": "2-3 sentence description of what is being built and for whom",
  "targetFramework": "${framework}",
  "routes": [
    {
      "title": "Human page name",
      "routePath": "/concrete/route (use [param] for dynamic)",
      "purpose": "what this page is for, specific to the product",
      "primaryUsers": ["role"],
      "requiredData": ["named entities/data this page reads or writes"],
      "initialDependencies": ["global data models or contexts this page leans on"]
    }
  ],
  "globalDataModels": [
    { "name": "Entity", "description": "...", "fields": [ { "name": "id", "type": "string", "description": "..." } ] }
  ],
  "globalContexts": [
    { "name": "XProvider", "filePath": "contexts/x-context.tsx", "responsibility": "...", "provides": ["..."] }
  ],
  "globalLibraries": [ { "name": "pkg", "reason": "why" } ],
  "risks": ["concrete delivery/UX/data risks for this specific app"]
}

Produce 5-9 routes that genuinely belong to this product (include dynamic detail routes like /resource/[id] where natural). Make routePaths and data names concrete to the domain.`,
    },
  ];
}

export function expandNodePrompt(
  plan: { title: string; summary: string; targetFramework: string },
  route: RouteSummary,
  siblings: { title: string; routePath: string | null }[],
): LLMMessage[] {
  const siblingList = siblings
    .map((s) => `- ${s.title} (${s.routePath ?? "?"})`)
    .join("\n");

  return [
    {
      role: "system",
      content:
        `You are a principal frontend engineer doing the atomic decomposition of ONE page in a ` +
        `${plan.targetFramework} app. Output the components (atoms/molecules/organisms/templates), ` +
        `hooks, contexts, data shape, realistic mock data, asset needs, libraries, edge cases and ` +
        `acceptance criteria that THIS page actually requires.` +
        ANTI_SLOP,
    },
    {
      role: "user",
      content: `App: ${plan.title} — ${plan.summary}
Page to expand: ${route.title} (${route.routePath})
Page purpose: ${route.purpose}
Primary users: ${route.primaryUsers.join(", ") || "n/a"}
Required data: ${route.requiredData.join(", ") || "n/a"}
Sibling pages (for consistent naming, do not redesign them):
${siblingList || "(none)"}

Return JSON with this exact shape:
{
  "purpose": "...",
  "primaryUsers": ["..."],
  "requiredData": ["..."],
  "atoms":      [ { "name":"", "atomicLevel":"atom", "filePath":"components/atoms/...", "purpose":"", "reason":"", "props":["..."], "dependsOn":[] } ],
  "molecules":  [ { "name":"", "atomicLevel":"molecule", "filePath":"components/molecules/...", "purpose":"", "reason":"", "props":[], "dependsOn":["atom names"] } ],
  "organisms":  [ { "name":"", "atomicLevel":"organism", "filePath":"components/organisms/...", "purpose":"", "reason":"", "props":[], "dependsOn":["molecule/atom names"] } ],
  "templates":  [ { "name":"", "atomicLevel":"template", "filePath":"components/templates/...", "purpose":"", "reason":"", "props":[], "dependsOn":[] } ],
  "hooks":      [ { "name":"useX", "filePath":"hooks/use-x.ts", "purpose":"", "input":"", "output":"", "state":"" } ],
  "contexts":   [ { "name":"", "filePath":"", "responsibility":"", "provides":["..."] } ],
  "dataModels": [ { "name":"", "description":"", "fields":[ { "name":"", "type":"", "description":"" } ] } ],
  "mockData":   [ { "name":"", "sample": { } } ],
  "assets":     [ { "name":"", "type":"icon|image|illustration|font", "purpose":"" } ],
  "libraries":  [ { "name":"", "reason":"" } ],
  "edgeCases":  ["empty state, error, loading, permissions, pagination, etc. — specific"],
  "acceptanceCriteria": ["testable statements an engineer can verify"]
}

Decompose only what this page needs. Prefer fewer, sharper components over a long generic list.`,
    },
  ];
}

export function regenerateNodePrompt(
  plan: { title: string; summary: string; targetFramework: string },
  route: { title: string; routePath: string | null },
  current: NodeContent | Record<string, unknown>,
  instruction: string,
  dependencyContext: string,
): LLMMessage[] {
  return [
    {
      role: "system",
      content:
        `You are revising the atomic decomposition of ONE page. Apply the user's instruction while ` +
        `KEEPING the rest of the plan coherent. Preserve compatible naming and dependencies; do not ` +
        `silently rewrite the global schema. Report what you changed.` +
        ANTI_SLOP,
    },
    {
      role: "user",
      content: `App: ${plan.title} — ${plan.summary}
Page: ${route.title} (${route.routePath})
Cross-plan dependencies to respect:
${dependencyContext || "(none recorded)"}

User instruction for regeneration: """${instruction || "Improve quality and specificity; remove any generic items."}"""

Current page content (JSON):
${JSON.stringify(current).slice(0, 6000)}

Return JSON with this exact shape:
{
  "content": { ...same shape as an expanded node (purpose, atoms, molecules, organisms, templates, hooks, contexts, dataModels, mockData, assets, libraries, edgeCases, acceptanceCriteria)... },
  "changedFields": ["which top-level fields you changed"],
  "newDependencies": ["any new global data models/contexts this now needs"],
  "staleDependents": ["names of things elsewhere that may now be inconsistent"],
  "rationale": "one paragraph on what changed and why"
}`,
    },
  ];
}

export function coherencePrompt(
  plan: PlanTree | { title: string; summary: string },
  nodesBrief: string,
): LLMMessage[] {
  return [
    {
      role: "system",
      content:
        `You are auditing a frontend plan for COHERENCE and SLOP. Find real inconsistencies ` +
        `(pages that need a data model that doesn't exist, components referenced but removed, ` +
        `routes whose data needs aren't met) and flag generic/low-value nodes. Be precise and ` +
        `conservative — only report genuine issues. Output JSON only.`,
    },
    {
      role: "user",
      content: `Plan: ${plan.title} — ${"summary" in plan ? plan.summary : ""}
Nodes (status + brief):
${nodesBrief}

Return JSON:
{
  "warnings": [
    { "severity":"info|warning|error",
      "kind":"broken_dependency|stale_dependency|missing_data_model|route_data_mismatch|orphaned_component|generic_slop|other",
      "nodeId": "uuid or null",
      "message":"specific problem",
      "suggestion":"concrete fix" }
  ]
}
Return an empty warnings array if the plan is coherent.`,
    },
  ];
}
