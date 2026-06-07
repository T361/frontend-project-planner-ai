# Implementation

## Directory map
```
app/
  (marketing)/page.tsx        landing (animated hero, features)
  (app)/layout.tsx            authed shell (header + user menu)
  (app)/dashboard/page.tsx    brief composer + plan grid + usage
  (app)/plans/[planId]/page.tsx   planner workspace (server load → client)
  (share)/share/[token]/page.tsx  read-only viewer (RPC or built-in sample)
  (auth)/auth/callback/route.ts   OAuth code exchange
  api/                        route handlers (see below)
components/
  atoms/      StatusBadge, MetricPill, SectionLabel, NodeTypeIcon, Logo
  molecules/  NodeRow
  organisms/  PlanTree, NodeInspector, NodeContentView, CoherencePanel,
              DashboardPlanGrid, HeroBackground, ShareViewer
  ui/         shadcn (@base-ui)
features/
  auth/       sign-in button, user menu, server actions
  planner/    PlannerWorkspace controller, dialogs, types
  export/     ExportMenu (md/json/agent-prompt/share)
  usage/      UsageMeter
lib/
  supabase/   client.ts, server.ts
  llm/        config.ts, client.ts (callLLM/callStructured), prompts.ts, log.ts
  validators/ primitives.ts, plan.ts, node.ts, coherence.ts  (Zod = source of truth)
  db/         types.ts, plan.ts (loadPlanBundle), versions.ts
  export/     index.ts (buildMarkdown/buildJsonExport/buildAgentPrompt)
  auth.ts, api.ts, sample-plan.ts
proxy.ts                       Next 16 "middleware": session relay + optimistic guard
supabase/migrations/           0001_schema, 0002_triggers, 0003_rls
```

## Data flow
**Generate:** dashboard → `POST /api/plans/generate` → `requireUser` → `callStructured(planTreeSchema, planTreePrompt)` → insert `plans` + one `plan_nodes` row per route (`expanded:false`) → log `llm_events` → redirect to `/plans/:id`.

**Expand (lazy):** inspector → `POST /api/nodes/:id/expand` → load node + plan summary + siblings → `callStructured(nodeContentSchema, expandNodePrompt)` → update `content`, `expanded:true` → snapshot `plan_versions` → log usage. Cached unless `?force=1`.

**Edit/accept/reject:** `PATCH /api/nodes/:id` (Zod `patchNodeInputSchema`) → merge content / set status → snapshot on content change.

**Regenerate:** `POST /api/nodes/:id/regenerate` → constrained context (plan summary + dependents only) → `regenerateOutputSchema` → update node + flag `staleDependents`.

**Coherence:** `POST /api/plans/:id/coherence-check` → deterministic checks (broken/stale edges, required-data with no global model, `stale_dependency` nodes) + optional LLM slop pass.

**Export/share:** `loadPlanBundle` → `buildMarkdown` / `buildJsonExport` / `buildAgentPrompt`; share creates a token row, public read via `get_shared_plan` RPC.

## Auth flow
`signInWithGoogle` server action → Supabase OAuth URL → Google → `/auth/callback` exchanges code for a cookie session (SSR client). `proxy.ts` relays/refreshes the session cookie on every request and optimistically redirects unauthenticated users away from `/dashboard` and `/plans`. Authorization is enforced server-side: each route calls `requireUser()` and all queries run under RLS.

## LLM flow
`callLLM` → OpenAI-compatible `/chat/completions`, json-mode, retry on 429/5xx with backoff, always returns `usage`. `callStructured` parses + Zod-validates; on failure, one repair call (bad output + zod error fed back); persistent failure throws `LLMError` carrying usage so the caller logs cost even on error.

## Tree coherence — design
The tree is route nodes; a page's atomic decomposition is one validated `content` document (not a row per component). Benefits: one snapshot per change, simple versioning, fewer round-trips, and the model produces one coherent page at a time. Cost: components aren't individually addressable nodes yet (see DEFERRED_SCOPE). Cross-node coherence is maintained via `node_dependencies` edges + the coherence checker; destructive ops (delete/regenerate) flag dependents `stale_dependency` rather than silently breaking them.

## Why these choices (interview-ready)
- **Lazy generation** = cost is proportional to drill-down, and each call is focused → higher quality.
- **Google-only** = the brief's hard constraint; no password surface to secure.
- **No client service-role** = the key can decrypt the whole DB and bypass RLS; it never leaves the server, and isn't even on the request path.
- **RLS** = tenancy enforced in Postgres, so an app bug can't leak another user's rows.
- **Atomic dirs** = the tool preaches atomic decomposition, so the repo practices it.
