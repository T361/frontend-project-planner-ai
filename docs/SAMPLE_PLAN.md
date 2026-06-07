# Sample plan — Kubernetes Workload Console

**Brief:** _"Build a cloud console for managing Kubernetes workloads with teams, environments, deployments, logs, alerts, and billing."_
**Framework:** Next.js · Live in-app: `/share/sample`

> This is the kind of output the tool produces: a route tree where each page can be drilled into real atomic decomposition with file paths, hooks (with I/O), data shapes, mock data, edge cases and acceptance criteria — not `Button.tsx` under every page.

## Global layer
**Data models:** `Workload { id, name, kind, environmentId, replicas, status }` · `Environment { id, name, cluster, teamId }` · `Deployment { id, workloadId, image, createdAt, state }`
**Contexts:** `EnvironmentProvider` (active environment + switcher).
**Libraries:** `@tanstack/react-query` (cache/poll cluster state), `recharts` (usage charts).
**Risks:** high-cardinality lists need server pagination + polling; log streaming must be virtualized; billing attribution needs consistent team labels.

## Route tree
| Route | Purpose | Status |
|---|---|---|
| `/overview` | Fleet health, spend trend, recent deploys | draft |
| `/workloads` | List/filter workloads with health + quick actions | **accepted, expanded** |
| `/workloads/[id]` | Inspect one workload: pods, deploys, usage, actions | **needs_review, expanded** |
| `/environments` | Manage namespaces/clusters, assign teams | draft |
| `/deployments` | Rollout history with rollback + diff | draft |
| `/logs` | Live filterable log stream per pod | draft |
| `/alerts` | Active alerts, acknowledge, routing | draft |
| `/billing` | Spend by team/environment, budget alerts | draft |
| `/settings` | Team membership, tokens, channels | draft |

## Expanded: `/workloads`
**Atoms** — `StatusDot` (`components/atoms/status-dot.tsx`, health color; indivisible visual), `ReplicaCount` (ready/desired; single value pair).
**Molecules** — `WorkloadFilterBar` (search + kind/status filters), `WorkloadRow` (row of status/replicas/actions).
**Organisms** — `WorkloadTable` (paginated/sortable; composed of rows + filter bar).
**Templates** — `EnvironmentScopedShell` (layout with env switcher).
**Hooks** — `useWorkloads` (`hooks/use-workloads.ts`): in `{ environmentId, filters }` → out `{ data, isLoading, error }`, react-query cache.
**Data shape** — `WorkloadListItem { id, name, status, ready, desired }`.
**Mock data** — `[{ id: "wl_1", name: "checkout-api", status: "Healthy", ready: 3, desired: 3 }, { id: "wl_2", name: "payments-worker", status: "Degraded", ready: 1, desired: 2 }]`.
**Libraries** — `@tanstack/react-query` (polling/caching).
**Edge cases** — empty environment; polling error / stale banner; 1000+ workloads → server pagination; no read on namespace.
**Acceptance criteria** —
- [ ] Switching environment refetches the list scoped to that env.
- [ ] Filtering by `status=Failed` shows only failed workloads.
- [ ] A degraded workload shows a non-green `StatusDot` and `ready < desired`.

## Expanded: `/workloads/[id]`
**Atoms** — `MetricValue` (formatted CPU/mem), `ActionButton` (confirmable destructive).
**Molecules** — `PodCard` (status/restarts/age), `ResourceGauge` (usage vs request).
**Organisms** — `PodList` (live pod statuses), `DeploymentTimeline` (rollout history + rollback).
**Hooks** — `useWorkload` (workload + pods), `useRollback` (mutation: `{ deploymentId }` → `{ rollback, isPending }`).
**Data shape** — `Pod { name, phase, restarts }`.
**Edge cases** — `CrashLoopBackOff` pod; rollback to deleted image; scale to 0; permission denied on restart.
**Acceptance criteria** —
- [ ] Rollback opens a confirm and posts to `useRollback`; timeline updates on success.
- [ ] A `CrashLoopBackOff` pod is visually distinct and shows restart count.

## Agent scaffold prompt (excerpt)
The "Export → Agent scaffold prompt" button produces a paste-ready prompt:
> _You are a senior frontend engineer. Scaffold a nextjs (App Router, TypeScript, Tailwind, shadcn/ui) project for: Kubernetes Workload Console… Use strict atomic architecture. Shared data models: Workload { … } … Routes to build: /workloads — Components: organism: WorkloadTable → components/organisms/workload-table.tsx … Hooks: useWorkloads … Acceptance: Switching environment refetches…_
