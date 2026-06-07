import type { PlanRow, PlanNodeRow, NodeDependencyRow } from "@/lib/db/types";
import type { NodeContent } from "@/lib/validators/node";

type Bundle = {
  plan: PlanRow;
  nodes: PlanNodeRow[];
  dependencies?: NodeDependencyRow[];
};

const content = (n: PlanNodeRow) => (n.content ?? {}) as Partial<NodeContent>;

/** Full machine-readable plan export. */
export function buildJsonExport(b: Bundle) {
  return {
    exportedAt: new Date().toISOString(),
    plan: {
      id: b.plan.id,
      title: b.plan.title,
      brief: b.plan.brief,
      targetFramework: b.plan.target_framework,
      status: b.plan.status,
      summary: b.plan.plan_summary,
    },
    nodes: b.nodes.map((n) => ({
      id: n.id,
      parentId: n.parent_id,
      type: n.node_type,
      title: n.title,
      routePath: n.route_path,
      status: n.status,
      expanded: n.expanded,
      content: n.content,
    })),
    dependencies: (b.dependencies ?? []).map((d) => ({
      source: d.source_node_id,
      target: d.target_node_id,
      type: d.dependency_type,
      status: d.status,
      reason: d.reason,
    })),
  };
}

function componentBlock(label: string, items: NodeContent["atoms"] = []) {
  if (!items.length) return "";
  const rows = items
    .map(
      (c) =>
        `| \`${c.name}\` | \`${c.filePath}\` | ${c.purpose} | ${c.reason} |`,
    )
    .join("\n");
  return `\n**${label}**\n\n| Component | File | Purpose | Why this level |\n|---|---|---|---|\n${rows}\n`;
}

/** Engineer-readable Markdown spec. */
export function buildMarkdown(b: Bundle): string {
  const lines: string[] = [];
  lines.push(`# ${b.plan.title}`);
  lines.push("");
  lines.push(`> ${b.plan.brief}`);
  lines.push("");
  lines.push(`**Target framework:** ${b.plan.target_framework}`);
  const summary = b.plan.plan_summary ?? {};
  if (summary.summary) lines.push(`\n${summary.summary}`);

  if (summary.globalDataModels?.length) {
    lines.push(`\n## Global data models`);
    for (const m of summary.globalDataModels) {
      lines.push(`\n### ${m.name}\n${m.description ?? ""}`);
      lines.push(`\n| Field | Type | Description |\n|---|---|---|`);
      for (const f of m.fields)
        lines.push(`| ${f.name} | \`${f.type}\` | ${f.description ?? ""} |`);
    }
  }
  if (summary.globalLibraries?.length) {
    lines.push(`\n## Global libraries`);
    for (const l of summary.globalLibraries)
      lines.push(`- **${l.name}** — ${l.reason}`);
  }

  lines.push(`\n## Routes`);
  const routeNodes = b.nodes.filter((n) => !n.parent_id);
  for (const n of routeNodes) {
    const c = content(n);
    lines.push(`\n### ${n.title} \`${n.route_path ?? ""}\` — _${n.status}_`);
    if (c.purpose) lines.push(c.purpose);
    if (c.primaryUsers?.length)
      lines.push(`\n*Users:* ${c.primaryUsers.join(", ")}`);
    if (!n.expanded) {
      lines.push(`\n_(not yet expanded)_`);
      continue;
    }
    lines.push(componentBlock("Atoms", c.atoms));
    lines.push(componentBlock("Molecules", c.molecules));
    lines.push(componentBlock("Organisms", c.organisms));
    lines.push(componentBlock("Templates", c.templates));
    if (c.hooks?.length) {
      lines.push(`\n**Hooks**`);
      for (const h of c.hooks)
        lines.push(
          `- \`${h.name}\` (\`${h.filePath}\`) — ${h.purpose}. in: ${h.input}; out: ${h.output}`,
        );
    }
    if (c.contexts?.length) {
      lines.push(`\n**Contexts**`);
      for (const x of c.contexts)
        lines.push(`- \`${x.name}\` — ${x.responsibility} (provides: ${x.provides.join(", ")})`);
    }
    if (c.dataModels?.length) {
      lines.push(`\n**Data shape**`);
      for (const m of c.dataModels)
        lines.push(
          `- \`${m.name}\`: ${m.fields.map((f) => `${f.name}: ${f.type}`).join(", ")}`,
        );
    }
    if (c.libraries?.length)
      lines.push(
        `\n**Libraries**: ${c.libraries.map((l) => `${l.name} (${l.reason})`).join("; ")}`,
      );
    if (c.edgeCases?.length) {
      lines.push(`\n**Edge cases**`);
      for (const e of c.edgeCases) lines.push(`- ${e}`);
    }
    if (c.acceptanceCriteria?.length) {
      lines.push(`\n**Acceptance criteria**`);
      for (const a of c.acceptanceCriteria) lines.push(`- [ ] ${a}`);
    }
  }
  return lines.join("\n");
}

/** Prompt ready to paste into Claude Code / Cursor to scaffold the project. */
export function buildAgentPrompt(b: Bundle): string {
  const s = b.plan.plan_summary ?? {};
  const routeNodes = b.nodes.filter((n) => !n.parent_id);
  const out: string[] = [];
  out.push(
    `You are a senior frontend engineer. Scaffold a ${b.plan.target_framework} (App Router, TypeScript, Tailwind, shadcn/ui) project for the following product. Use strict atomic component architecture (components/atoms, components/molecules, components/organisms, components/templates).`,
  );
  out.push(`\n## Product\n${b.plan.title} — ${b.plan.brief}`);
  if (s.summary) out.push(s.summary);

  if (s.globalDataModels?.length) {
    out.push(`\n## Shared data models (define as TypeScript types in lib/types.ts)`);
    for (const m of s.globalDataModels)
      out.push(
        `- ${m.name}: { ${m.fields.map((f) => `${f.name}: ${f.type}`).join("; ")} }`,
      );
  }

  out.push(`\n## Routes to build`);
  for (const n of routeNodes) {
    const c = content(n);
    out.push(`\n### ${n.route_path ?? n.title} — ${n.title}`);
    if (c.purpose) out.push(c.purpose);
    if (!n.expanded) {
      out.push(`(expand this route's components before implementing)`);
      continue;
    }
    const comps = [
      ...(c.atoms ?? []),
      ...(c.molecules ?? []),
      ...(c.organisms ?? []),
      ...(c.templates ?? []),
    ];
    if (comps.length)
      out.push(
        `Components:\n${comps.map((x) => `  - ${x.atomicLevel}: ${x.name} -> ${x.filePath} (${x.purpose})`).join("\n")}`,
      );
    if (c.hooks?.length)
      out.push(`Hooks: ${c.hooks.map((h) => `${h.name} (${h.filePath})`).join(", ")}`);
    if (c.contexts?.length)
      out.push(`Contexts: ${c.contexts.map((x) => x.name).join(", ")}`);
    if (c.acceptanceCriteria?.length)
      out.push(`Acceptance: ${c.acceptanceCriteria.join("; ")}`);
  }
  out.push(
    `\n## Implementation phases\n1. Project setup + design tokens.\n2. Shared types, contexts, and data layer with mock data.\n3. Atoms → molecules → organisms per route.\n4. Wire routes, loading/error/empty states.\n5. Acceptance-criteria pass.`,
  );
  return out.join("\n");
}
