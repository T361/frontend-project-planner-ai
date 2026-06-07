import type { PlanNodeRow, PlanRow } from "@/lib/db/types";

/**
 * A built-in, non-trivial sample plan (Kubernetes workload console). Powers the
 * public /share/sample page and docs/SAMPLE_PLAN.md so the marketing CTA works
 * with zero database dependency. Two routes are fully expanded to show depth.
 */

const c = (
  name: string,
  level: "atom" | "molecule" | "organism" | "template",
  file: string,
  purpose: string,
  reason: string,
  dependsOn: string[] = [],
) => ({ name, atomicLevel: level, filePath: file, purpose, reason, props: [], dependsOn });

export const SAMPLE_PLAN: { plan: PlanRow; nodes: PlanNodeRow[] } = {
  plan: {
    id: "sample",
    owner_id: "sample",
    title: "Kubernetes Workload Console",
    brief:
      "Build a cloud console for managing Kubernetes workloads with teams, environments, deployments, logs, alerts, and billing.",
    target_framework: "nextjs",
    status: "generated",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    plan_summary: {
      title: "Kubernetes Workload Console",
      summary:
        "An operator-facing console to manage workloads across environments: deploy, observe logs, respond to alerts, and track spend per team.",
      targetFramework: "nextjs",
      routes: [],
      globalDataModels: [
        { name: "Workload", description: "A deployable unit (Deployment/StatefulSet).", fields: [
          { name: "id", type: "string", description: "uid" },
          { name: "name", type: "string", description: "" },
          { name: "kind", type: "'Deployment' | 'StatefulSet' | 'CronJob'", description: "" },
          { name: "environmentId", type: "string", description: "" },
          { name: "replicas", type: "number", description: "desired" },
          { name: "status", type: "'Healthy' | 'Degraded' | 'Failed'", description: "" },
        ]},
        { name: "Environment", description: "A cluster namespace grouping.", fields: [
          { name: "id", type: "string", description: "" },
          { name: "name", type: "string", description: "e.g. prod, staging" },
          { name: "cluster", type: "string", description: "" },
          { name: "teamId", type: "string", description: "" },
        ]},
        { name: "Deployment", description: "A rollout of a workload revision.", fields: [
          { name: "id", type: "string", description: "" },
          { name: "workloadId", type: "string", description: "" },
          { name: "image", type: "string", description: "" },
          { name: "createdAt", type: "string", description: "ISO" },
          { name: "state", type: "'Progressing' | 'Complete' | 'RolledBack'", description: "" },
        ]},
      ],
      globalContexts: [
        { name: "EnvironmentProvider", filePath: "contexts/environment-context.tsx", responsibility: "Holds the active environment and exposes a switcher used across pages.", provides: ["activeEnvironment", "setActiveEnvironment", "environments"] },
      ],
      globalLibraries: [
        { name: "@tanstack/react-query", reason: "Cache + poll cluster state without re-fetch storms." },
        { name: "recharts", reason: "Resource/usage charts on overview and billing." },
      ],
      risks: [
        "Live cluster data is high-cardinality; lists need server pagination + polling, not full reloads.",
        "Log streaming must be virtualized or it will jank on busy pods.",
        "Billing attribution by team requires consistent labels across environments.",
      ],
    },
  },
  nodes: [
    route(0, "Overview", "/overview", "Fleet health, spend trend, and recent deploys at a glance.", ["Team lead", "SRE"], ["Workload", "Environment"]),
    expandedWorkloads(1),
    expandedWorkloadDetail(2),
    route(3, "Environments", "/environments", "Manage namespaces/clusters and assign teams.", ["Platform admin"], ["Environment"]),
    route(4, "Deployments", "/deployments", "Rollout history with rollback and diff.", ["SRE"], ["Deployment", "Workload"]),
    route(5, "Logs", "/logs", "Live, filterable log stream per pod.", ["SRE", "Developer"], ["Workload"]),
    route(6, "Alerts", "/alerts", "Active alerts with acknowledge and routing rules.", ["On-call"], ["Workload"]),
    route(7, "Billing", "/billing", "Spend by team/environment with budget alerts.", ["Finance", "Team lead"], ["Environment"]),
    route(8, "Settings", "/settings", "Team membership, tokens, and notification channels.", ["Admin"], []),
  ],
};

function base(i: number, title: string, route_path: string): Omit<PlanNodeRow, "content" | "expanded" | "status"> {
  return {
    id: `sample-${i}`,
    plan_id: "sample",
    owner_id: "sample",
    parent_id: null,
    node_type: "route",
    title,
    route_path,
    depth: 0,
    sort_order: i,
    llm_context: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function route(i: number, title: string, path: string, purpose: string, users: string[], data: string[]): PlanNodeRow {
  return {
    ...base(i, title, path),
    status: "draft",
    expanded: false,
    content: { purpose, primaryUsers: users, requiredData: data },
  };
}

function expandedWorkloads(i: number): PlanNodeRow {
  return {
    ...base(i, "Workloads", "/workloads"),
    status: "accepted",
    expanded: true,
    content: {
      purpose: "List and filter workloads in the active environment with health and quick actions.",
      primaryUsers: ["SRE", "Developer"],
      requiredData: ["Workload", "Environment"],
      atoms: [
        c("StatusDot", "atom", "components/atoms/status-dot.tsx", "Color dot for Healthy/Degraded/Failed.", "Single indivisible visual primitive."),
        c("ReplicaCount", "atom", "components/atoms/replica-count.tsx", "Renders ready/desired replicas.", "Pure display of one value pair."),
      ],
      molecules: [
        c("WorkloadFilterBar", "molecule", "components/molecules/workload-filter-bar.tsx", "Search + kind/status filters.", "Composes inputs/selects into one control.", ["StatusDot"]),
        c("WorkloadRow", "molecule", "components/molecules/workload-row.tsx", "One table row with status, replicas, actions.", "Combines atoms into a meaningful unit.", ["StatusDot", "ReplicaCount"]),
      ],
      organisms: [
        c("WorkloadTable", "organism", "components/organisms/workload-table.tsx", "Paginated, sortable workloads table.", "Page-defining section composed of rows + filter bar.", ["WorkloadRow", "WorkloadFilterBar"]),
      ],
      templates: [
        c("EnvironmentScopedShell", "template", "components/templates/environment-scoped-shell.tsx", "Layout with env switcher header.", "Reusable layout scaffold for env-scoped pages."),
      ],
      hooks: [
        { name: "useWorkloads", filePath: "hooks/use-workloads.ts", purpose: "Fetch + poll workloads for an environment.", input: "{ environmentId, filters }", output: "{ data, isLoading, error }", state: "react-query cache" },
      ],
      contexts: [
        { name: "EnvironmentProvider", filePath: "contexts/environment-context.tsx", responsibility: "Active environment used to scope the list.", provides: ["activeEnvironment"] },
      ],
      dataModels: [
        { name: "WorkloadListItem", description: "Row projection.", fields: [
          { name: "id", type: "string", description: "" },
          { name: "name", type: "string", description: "" },
          { name: "status", type: "'Healthy'|'Degraded'|'Failed'", description: "" },
          { name: "ready", type: "number", description: "" },
          { name: "desired", type: "number", description: "" },
        ]},
      ],
      mockData: [
        { name: "workloads", sample: [
          { id: "wl_1", name: "checkout-api", status: "Healthy", ready: 3, desired: 3 },
          { id: "wl_2", name: "payments-worker", status: "Degraded", ready: 1, desired: 2 },
        ]},
      ],
      assets: [{ name: "kind-icons", type: "icon", purpose: "Glyphs for Deployment/StatefulSet/CronJob." }],
      libraries: [{ name: "@tanstack/react-query", reason: "Polling + caching of list." }],
      edgeCases: ["empty environment", "polling error / stale data banner", "1000+ workloads → server pagination", "user lacks read on namespace"],
      acceptanceCriteria: [
        "Switching environment refetches the list scoped to that env.",
        "Filtering by status='Failed' shows only failed workloads.",
        "A degraded workload shows a non-green StatusDot and ready<desired.",
      ],
    },
  };
}

function expandedWorkloadDetail(i: number): PlanNodeRow {
  return {
    ...base(i, "Workload detail", "/workloads/[id]"),
    status: "needs_review",
    expanded: true,
    content: {
      purpose: "Inspect a single workload: pods, recent deploys, resource usage, and actions (scale, restart, rollback).",
      primaryUsers: ["SRE"],
      requiredData: ["Workload", "Deployment"],
      atoms: [
        c("MetricValue", "atom", "components/atoms/metric-value.tsx", "Formatted CPU/memory value.", "Single value formatter."),
        c("ActionButton", "atom", "components/atoms/action-button.tsx", "Confirmable destructive action button.", "One interactive primitive."),
      ],
      molecules: [
        c("PodCard", "molecule", "components/molecules/pod-card.tsx", "Pod status + restarts + age.", "Composition of atoms into a unit.", ["MetricValue"]),
        c("ResourceGauge", "molecule", "components/molecules/resource-gauge.tsx", "CPU/mem usage vs request.", "Chart + label composition.", ["MetricValue"]),
      ],
      organisms: [
        c("PodList", "organism", "components/organisms/pod-list.tsx", "All pods for the workload with live status.", "Page section.", ["PodCard"]),
        c("DeploymentTimeline", "organism", "components/organisms/deployment-timeline.tsx", "Rollout history with rollback.", "Page section.", ["ActionButton"]),
      ],
      templates: [
        c("DetailShell", "template", "components/templates/detail-shell.tsx", "Header + tabbed body layout.", "Layout scaffold for detail pages."),
      ],
      hooks: [
        { name: "useWorkload", filePath: "hooks/use-workload.ts", purpose: "Fetch one workload + its pods.", input: "workloadId", output: "{ workload, pods, isLoading }", state: "react-query" },
        { name: "useRollback", filePath: "hooks/use-rollback.ts", purpose: "Mutation to roll back to a revision.", input: "{ deploymentId }", output: "{ rollback, isPending }", state: "mutation" },
      ],
      contexts: [],
      dataModels: [
        { name: "Pod", description: "", fields: [
          { name: "name", type: "string", description: "" },
          { name: "phase", type: "'Running'|'Pending'|'CrashLoopBackOff'", description: "" },
          { name: "restarts", type: "number", description: "" },
        ]},
      ],
      mockData: [
        { name: "pods", sample: [
          { name: "checkout-api-7d9", phase: "Running", restarts: 0 },
          { name: "checkout-api-7d9-b2", phase: "CrashLoopBackOff", restarts: 14 },
        ]},
      ],
      assets: [],
      libraries: [{ name: "recharts", reason: "Resource usage gauges." }],
      edgeCases: ["pod in CrashLoopBackOff", "rollback to a deleted image", "scale to 0", "permission denied on restart"],
      acceptanceCriteria: [
        "Rollback opens a confirm and posts to useRollback; timeline updates on success.",
        "A CrashLoopBackOff pod is visually distinct and shows restart count.",
      ],
    },
  };
}
