# PRD — Frontend Project Planner

## Problem
Starting a frontend project means turning a fuzzy idea into pages, components, hooks, contexts, data shapes and libraries. People either over-plan in docs that rot or under-plan and discover the architecture mid-build. LLM "plan my app" chats produce plausible wishlists (`Button.tsx` under every page) that ship nothing.

## Target user
A frontend engineer or an AI coding agent's operator who wants a **structured, drillable starting plan** they can edit and hand off.

## Core user journey
1. Sign in with Google.
2. Type a brief in plain English.
3. Get a **route-level** plan tree (pages + global data models/contexts/libs + risks).
4. Click a page → **lazily expand** it into atoms/molecules/organisms/templates, hooks, contexts, data shape, mock data, assets, libraries, edge cases, acceptance criteria.
5. **Edit / accept / reject / regenerate** any node.
6. Coherence check flags broken/stale/missing-model issues; deleting or regenerating a node flags dependents.
7. **Export** a Markdown spec, JSON plan, or agent scaffolding prompt; **share** a read-only link.

## MVP scope (shipped)
- Google-only auth, RLS-enforced multi-tenant data.
- Lazy generation (generate routes → expand per node).
- Drillable tree with edit/accept/reject/regenerate/delete, versioned.
- Structured LLM outputs (Zod) with retry + repair + usage logging.
- Coherence checks (deterministic + LLM).
- Markdown / JSON / agent-prompt exports; read-only share links.
- LLM usage/cost dashboard.

## Stretch (shipped)
Saved + versioned plans · shareable read-only links · agent scaffold prompt · usage/cost dashboard.

## Non-goals
Actual code generation; live cluster/data integration; team collaboration/RBAC; real-time multiplayer; billing.

## Evaluation mapping
- **Plan quality** → anti-slop prompts, required file paths + reasons + acceptance criteria, lazy depth.
- **Tree UX** → in-place state updates, per-node actions, skeletons, coherence panel.
- **LLM orchestration** → `callStructured` retry/repair, usage logging, lazy/constrained context.
- **Code quality** → atomic dirs, strict TS, RLS, server-only LLM.
- **AI workflow** → docs/AI_WORKFLOW.md.

## Data model
`profiles, plans, plan_nodes, node_dependencies, plan_versions, llm_events, share_links` — see README schema overview and `supabase/migrations`.

## LLM orchestration
Server-only Groq (OpenAI-compatible). `generate` = routes + global layer; `expand` = one page; `regenerate` = one node with change report; `coherence-check` = deterministic + optional LLM. All validated by Zod; one repair retry; cost/latency logged per call.

## Security
RLS on every table, `owner_id = auth.uid()`. No service-role on the request path. Read-only sharing via `SECURITY DEFINER` RPC. Server-only secrets. See docs/SECURITY.md.

## Deployment
Vercel (Next.js 16, Turbopack). Supabase managed Postgres/Auth. Env via Vercel project settings.

## Risks & mitigations
- *Model returns invalid JSON* → json-mode + extract + Zod + one repair + error logging.
- *Slop* → anti-slop prompt contract + coherence slop pass.
- *Cost blowup* → lazy generation + constrained context + per-plan usage meter.
- *Cross-tenant leak* → RLS-only access, no service-role, narrow share RPC.
