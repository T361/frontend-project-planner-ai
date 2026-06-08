# Frontend Project Planner

> Turn a vague product brief into a **navigable, editable, drillable atomic frontend plan tree** an engineer (or an agent) can actually start from.

Type a brief like _"build a cloud console for managing Kubernetes workloads"_ → get a route-level plan. Click any page → it lazily expands into the **atoms, molecules, organisms, hooks, contexts, data shape, mock data, assets and libraries** that page actually needs. Edit, accept, reject, or regenerate any node. Export a Markdown spec, a JSON plan, or a paste-ready scaffolding prompt for Claude Code / Cursor.

- **Live app:** https://frontend-project-planner-ai.vercel.app
- **Repo:** https://github.com/T361/frontend-project-planner-ai
- **Sample plan:** https://frontend-project-planner-ai.vercel.app/share/sample · [docs/SAMPLE_PLAN.md](docs/SAMPLE_PLAN.md)

---

## Stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 16** (App Router, Turbopack), TypeScript (strict) |
| UI | **shadcn/ui** (on @base-ui) + Tailwind CSS v4 |
| Architecture | **Atomic** — `components/atoms · molecules · organisms · templates` |
| DB + Auth | **Supabase** (Postgres + Auth), **RLS enforced**, **Google OAuth only** |
| LLM | **Groq** (`llama-3.3-70b-versatile`), OpenAI-compatible, **server-side only** |
| Deploy | **Vercel** |

### Why Groq

LLM choice is a cost/latency decision because generation is **per-node and lazy**. Groq's `llama-3.3-70b-versatile` gives near-instant responses at ~$0.59/$0.79 per 1M in/out tokens, so expanding a node feels interactive and a whole plan costs cents. The client is plain `fetch` against the OpenAI-compatible `/chat/completions` endpoint with `response_format: json_object`, so switching to OpenAI/Anthropic/Gemini is a base-URL + key change (`lib/llm/config.ts`). All calls run in route handlers — the key is never in the browser.

---

## Local setup

```bash
git clone https://github.com/T361/frontend-project-planner-ai
cd frontend-project-planner-ai
npm install
cp .env.example .env.local   # fill in real values
# Apply the DB schema (see "Database" below)
npm run dev                  # http://localhost:3000
```

Quality gates: `npm run lint` · `npm run typecheck` · `npm run build`.

### Environment variables

| Var | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Publishable/anon key — safe for browser |
| `SUPABASE_SERVICE_ROLE_KEY` | server only (optional) | **Not used by the app** (RLS is never bypassed). Kept for admin scripts only |
| `SUPABASE_PROJECT_REF` | server | Project ref |
| `LLM_PROVIDER` / `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL` | **server only** | Groq by default |
| `NEXT_PUBLIC_APP_URL` | client + server | Used to build OAuth redirect + share URLs |

`.env.local` is gitignored. `.env.example` ships placeholders only.

---

## Database

Tables (`supabase/migrations/`): `profiles`, `plans`, `plan_nodes`, `node_dependencies`, `plan_versions`, `llm_events`, `share_links`.

**Apply the schema** — paste [`supabase/COMBINED_SETUP.sql`](supabase/COMBINED_SETUP.sql) into the Supabase **SQL Editor** and run it (or `supabase db push` with the CLI). It is idempotent.

### RLS

Every table has RLS enabled. The app **only** uses the publishable/anon key with the signed-in user's JWT, so `auth.uid()` identifies the user and every policy is `owner_id = auth.uid()` (`id = auth.uid()` for `profiles`). There is **no** policy that allows cross-user reads or public writes.

Public read-only sharing does **not** open the tables: anon calls a `SECURITY DEFINER` function `get_shared_plan(token)` that returns a plan **only** if the token is active and unexpired, with `owner_id` stripped. See [docs/SECURITY.md](docs/SECURITY.md).

### Google OAuth

Supabase Dashboard → Authentication → Providers → **Google** (enabled). In Authentication → URL Configuration add to **Redirect URLs**:
```
http://localhost:3000/auth/callback
https://<your-vercel-domain>/auth/callback
```
In Google Cloud Console → OAuth client → Authorized redirect URIs:
```
https://<PROJECT_REF>.supabase.co/auth/v1/callback
```

---

## Schema overview

```
profiles(id→auth.users, email, full_name, avatar_url)
plans(id, owner_id, title, brief, target_framework, status, plan_summary jsonb)
plan_nodes(id, plan_id, owner_id, parent_id, node_type, title, route_path,
           status, depth, sort_order, content jsonb, expanded)
node_dependencies(id, plan_id, owner_id, source_node_id, target_node_id,
                  dependency_type, status, reason)
plan_versions(id, plan_id, owner_id, node_id, version_number, snapshot jsonb, reason)
llm_events(id, plan_id, node_id, owner_id, provider, model, operation,
           input_tokens, output_tokens, cost_estimate, latency_ms, success)
share_links(id, plan_id, owner_id, token unique, is_active, expires_at)
```

A node's expanded detail lives in `plan_nodes.content` (jsonb) rather than as separate rows — the tree is route nodes, and atomic decomposition is the validated content payload. Trade-off discussed in [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md).

---

## Architecture (short)

- **Lazy generation** — `POST /api/plans/generate` produces only the route tree + global layer. Components are generated per node on `POST /api/nodes/[id]/expand`. Token cost is proportional to what the user drills into.
- **Structured outputs** — every model response is parsed and validated with **Zod** (`lib/validators/*`). On failure there's one automatic JSON-repair retry; persistent failures are logged to `llm_events` and surfaced as a clean error (never bad data).
- **Coherence** — `POST /api/plans/[id]/coherence-check` combines deterministic DB checks (broken/stale edges, route data with no matching model) with an optional LLM "slop" pass. Deleting a node flags dependents `stale_dependency`; regenerating flags affected dependents.
- **Versioning** — every expand/edit/regenerate writes an immutable `plan_versions` snapshot.
- **Atomic discipline in the repo** — `components/atoms` (StatusBadge, MetricPill, NodeTypeIcon …) → `molecules` (NodeRow, BriefComposer, UsageMeter …) → `organisms` (PlanTree, NodeInspector, CoherencePanel …) → `templates`/feature controllers.

Full write-up: [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md) · product spec: [docs/PRD.md](docs/PRD.md).

---

## Design decisions

- **Content-in-jsonb over a row per component.** The unit users act on is the page; its decomposition is one validated document. Simpler coherence + versioning, fewer round-trips. (Deferred: promoting components to addressable child nodes — see DEFERRED_SCOPE.)
- **No service-role on the server path.** Everything runs as the user under RLS; sharing uses a narrow `SECURITY DEFINER` RPC. This is the cheapest way to be confident there's no cross-tenant leak.
- **`proxy.ts` not `middleware.ts`.** Next 16 renamed Middleware to Proxy; it does optimistic redirects only — real authz is RLS + per-route `requireUser()`.
- **Deterministic + LLM coherence.** The cheap, reliable checks run always; the LLM pass is best-effort and never blocks.

## Sample plan

`/share/sample` renders a built-in, fully-expanded **Kubernetes Workload Console** plan (no login/DB needed). Markdown: [docs/SAMPLE_PLAN.md](docs/SAMPLE_PLAN.md).

## AI workflow

[docs/AI_WORKFLOW.md](docs/AI_WORKFLOW.md) — scoping, the verbatim agent prompts used to build this, rejected/corrected AI output, and how the planner's own prompts were tuned.

## Consciously deferred

[docs/DEFERRED_SCOPE.md](docs/DEFERRED_SCOPE.md).

---

Built by **Taimoor Shaukat** for the Enablers.ai / Manaracloud.ai assessment.
