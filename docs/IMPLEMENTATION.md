# IMPLEMENTATION.md — The Complete Codebase Guide

> **Frontend Project Planner** — an end-to-end, professional walkthrough of the entire codebase: every folder, every file, what it does, why it exists, how data moves through it, and every design decision behind it.
>
> This document is written so that a new engineer (or the candidate in a reasoning interview) can open **any** file in the repo and immediately understand its responsibility, its collaborators, and the trade-offs that shaped it.

---

## Table of Contents

1. [What this product is](#1-what-this-product-is)
2. [Technology stack & exact versions](#2-technology-stack--exact-versions)
3. [Architectural philosophy](#3-architectural-philosophy)
4. [The complete, annotated directory tree](#4-the-complete-annotated-directory-tree)
5. [End-to-end application flows](#5-end-to-end-application-flows)
6. [The data model & database deep-dive](#6-the-data-model--database-deep-dive)
7. [The security model](#7-the-security-model)
8. [LLM orchestration deep-dive](#8-llm-orchestration-deep-dive)
9. [Atomic component architecture](#9-atomic-component-architecture)
10. [File-by-file reference: `lib/`](#10-file-by-file-reference-lib)
11. [File-by-file reference: `supabase/` & root config](#11-file-by-file-reference-supabase--root-config)
12. [File-by-file reference: `components/`](#12-file-by-file-reference-components)
13. [File-by-file reference: `features/`](#13-file-by-file-reference-features)
14. [File-by-file reference: `app/` (routes, pages, API)](#14-file-by-file-reference-app-routes-pages-api)
15. [The styling, theming & animation system](#15-the-styling-theming--animation-system)
16. [Error handling & resilience strategy](#16-error-handling--resilience-strategy)
17. [Environment variables](#17-environment-variables)
18. [Build, lint, typecheck & deployment pipeline](#18-build-lint-typecheck--deployment-pipeline)
19. [Testing & verification](#19-testing--verification)
20. [Consolidated design decisions & trade-offs](#20-consolidated-design-decisions--trade-offs)
21. [Consciously deferred scope](#21-consciously-deferred-scope)
22. [Glossary](#22-glossary)
23. [Interview defense: "explain this file / was the agent right?"](#23-interview-defense)

---

## 1. What this product is

The Frontend Project Planner is a tool that converts a **vague, plain-English product brief** ("build a CRM", "build a cloud console for managing Kubernetes workloads", "build a customer support portal") into a **navigable, editable, drillable plan tree** that starts at the page/route level.

The fundamental insight is that every frontend project begins with the same painful translation: turning a fuzzy idea into concrete **pages → components → hooks → contexts → data shapes → mock data → assets → libraries**. People either over-plan in documents that rot, or under-plan and discover the architecture mid-build. Generic "plan my app" LLM chats produce plausible wishlists — `Button.tsx` listed under every page — that read well and ship nothing.

This tool solves that with three core ideas:

1. **Route-first, lazy generation.** The first LLM call produces only the *route tree* plus a *global layer* (shared data models, contexts, libraries, risks). It does **not** generate every component for every page up-front — that would burn token budget producing a universe the user may never look at. Instead, when the user clicks a page node, a second, focused LLM call **expands** just that page into its real atomic decomposition.

2. **Real atomic discipline.** Every generated component is tagged as an **atom**, **molecule**, **organism** or **template**, comes with a concrete **file path**, and — critically — a **reason it sits at that atomic level**. The prompts forbid filler ("modern", "scalable") and ban the `Button-under-every-page` anti-pattern.

3. **Coherence.** Regenerating or deleting one node must not silently invalidate the rest of the plan. The system tracks dependencies and flags dependents as `stale_dependency`; a coherence check (deterministic + LLM) surfaces broken edges, missing data models, and generic slop.

Everything a signed-in user can do:

- Describe an app and receive a generated **page-level tree**.
- **Drill into** any page → lazily expand it into atoms/molecules/organisms, hooks, contexts, data shape, mock data, asset requirements, libraries, edge cases, acceptance criteria.
- **Edit, accept, reject, regenerate** any node individually, with each change creating a **version snapshot**.
- Run a **coherence check**.
- **Export** a Markdown spec, a JSON plan, or a paste-ready **agent scaffolding prompt** for Claude Code / Cursor.
- Create **read-only share links**.
- Watch a per-plan **LLM usage / cost dashboard**.

### The output is the product

The single most important quality bar is: **would an engineer actually start from what the tool produces?** Not "does it read plausibly," but "could I open a pull request from this." Every prompt, schema, and UI affordance is bent toward that bar.

---

## 2. Technology stack & exact versions

| Layer | Choice | Version | Why |
|---|---|---|---|
| Framework | **Next.js** (App Router, Turbopack) | `16.2.7` | App Router gives server components + route handlers in one place; Turbopack is the default bundler in 16. |
| Language | **TypeScript** (strict) | `^5` | Strict typing across the LLM boundary catches malformed model output at compile time. |
| UI runtime | **React** | `19.2.4` | Required by Next 16. |
| Component library | **shadcn/ui** on **@base-ui** | shadcn `^4.10`, `@base-ui/react ^1.5` | Accessible primitives we own in-repo (copied components), not a black-box dependency. |
| Styling | **Tailwind CSS v4** | `^4` | Utility-first; v4's `@theme` + CSS variables drive the dark enterprise theme. |
| Animations | `tw-animate-css` + custom CSS keyframes | `^1.4` | Enter/exit + aurora/particle motion without a heavy animation library. |
| Database | **Supabase Postgres** | hosted | Managed Postgres with Row Level Security and Auth in one product. |
| Auth | **Supabase Auth — Google OAuth only** | `@supabase/ssr ^0.10`, `@supabase/supabase-js ^2.107` | SSR-friendly cookie sessions; Google is the only sign-in method by requirement. |
| Validation | **Zod** | `^4.4` | Single source of truth for all structured shapes; validates 100% of LLM output. |
| Forms | `react-hook-form` + `@hookform/resolvers` | `^7.77` / `^5.4` | Available for structured editing (kept minimal). |
| Icons | `lucide-react` | `^1.17` | Consistent, tree-shakeable icon set. |
| Toasts | `sonner` | `^2.0` | Non-blocking feedback for async actions. |
| Dates | `date-fns` | `^4.4` | `formatDistanceToNow` for "updated X ago". |
| Class utils | `clsx` + `tailwind-merge` (via `cn()`) | `^2.1` / `^3.6` | Conflict-free conditional class composition. |
| LLM provider | **Groq** (OpenAI-compatible) | `llama-3.3-70b-versatile` | Near-instant inference at low cost makes per-node lazy generation feel interactive. |
| Hosting | **Vercel** | — | First-class Next.js hosting; auto-deploy on push to `main`. |

### Why Next.js 16 specifically matters to the code

Next 16 introduced breaking changes that shape several files:

- **`middleware.ts` → `proxy.ts`.** The middleware convention was renamed to "Proxy." Our session-refresh + optimistic-guard logic lives in [`proxy.ts`](../proxy.ts), exporting a `proxy()` function and a `config.matcher`.
- **Async request APIs.** `cookies()`, `headers()`, and route/page `params`/`searchParams` are all **Promises** and must be `await`ed. Every server Supabase client (`await cookies()`) and every dynamic route handler (`await ctx.params`) reflects this.
- **Turbopack by default** for `next dev` and `next build` — there is no custom webpack config.

---

## 3. Architectural philosophy

Five principles govern the whole codebase.

### 3.1 Zod schemas are the single source of truth

Nothing about the shape of a plan, a node's content, a regenerate result, or a coherence report is hand-typed in two places. It is declared **once** as a Zod schema in `lib/validators/`, and the TypeScript type is **inferred** from it via `z.infer`. This means:

- The exact same schema that the UI and DB rely on is the schema that **validates every LLM response**.
- If the model returns a component without a `reason`, or a hook without an `output`, `safeParse` fails and the data never reaches the database or the user.
- Changing a field is a one-line change that ripples through types automatically.

### 3.2 Server-only boundaries are explicit

Anything that must never reach the browser imports the `server-only` package at the top of the file. This is true for:

- `lib/llm/config.ts` (holds the API key),
- `lib/llm/client.ts`, `lib/llm/prompts.ts`, `lib/llm/log.ts`,
- `lib/db/plan.ts`, `lib/db/versions.ts`.

If any client component ever imports one of these (even transitively), the build **fails** — a compile-time guarantee that the LLM key, prompts, and privileged DB helpers stay on the server.

### 3.3 Tenancy is enforced in the database, not the application

The app talks to Supabase using **only** the publishable/anon key plus the signed-in user's JWT (carried in cookies). Postgres Row Level Security policies (`owner_id = auth.uid()`) decide what every query can see or write. The application never uses the service-role key on the request path, and never "filters by user id in JavaScript and hopes." Even a bug in a route handler cannot leak another user's rows, because the database refuses.

### 3.4 Lazy, cost-proportional generation

Token cost scales with what the user actually drills into. Generation is split across **operations**, each a separate, focused LLM call:

- `generate` → routes + global layer only.
- `expand` → one page's components, on demand, cached afterward.
- `regenerate` → one node, with constrained context (plan summary + siblings + dependents) — never the whole tree.

This is both a cost decision *and* a quality decision: a model asked to decompose one page produces sharper output than one asked to design the entire universe in a single shot.

### 3.5 Atomic design is practiced, not just preached

The tool's entire value proposition is atomic decomposition — so the repository itself is organized atomically: `components/atoms` → `components/molecules` → `components/organisms` → `components/templates`, with feature-level controllers in `features/`. You cannot credibly sell atomic discipline in a tool whose own code is a pile of 600-line components.

---

## 4. The complete, annotated directory tree

```
frontend-project-planner-ai/
│
├── app/                                  # Next.js App Router root
│   │
│   ├── layout.tsx                        # Root layout: fonts, forces dark mode, mounts <Toaster>
│   ├── globals.css                       # Tailwind v4 entry + brand theme + animations/utilities
│   ├── error.tsx                         # Root error boundary (Try again / Home / Log out)
│   ├── not-found.tsx                     # Themed 404
│   │
│   ├── (marketing)/                      # Route group → "/" (no URL segment)
│   │   └── page.tsx                      # Landing page (hero, features, how-it-works, footer)
│   │
│   ├── (auth)/                           # Route group for auth endpoints
│   │   └── auth/
│   │       ├── callback/route.ts         # OAuth code → session exchange
│   │       └── signout/route.ts          # GET logout → clears session → "/"
│   │
│   ├── (app)/                            # Route group for AUTHENTICATED app (shared shell)
│   │   ├── layout.tsx                    # Authed shell: header + UserMenu; redirects if no session
│   │   ├── error.tsx                     # In-shell error boundary (keeps header visible)
│   │   ├── dashboard/
│   │   │   └── page.tsx                  # Brief composer + plan grid + usage meter
│   │   └── plans/
│   │       └── [planId]/
│   │           └── page.tsx              # Loads a plan bundle → <PlannerWorkspace>
│   │
│   ├── (share)/                          # Route group for public read-only sharing
│   │   └── share/
│   │       └── [token]/
│   │           └── page.tsx              # "sample" → built-in plan; else get_shared_plan RPC
│   │
│   └── api/                              # Route handlers (the server API)
│       ├── plans/
│       │   ├── generate/route.ts         # POST: create plan + lazy route tree
│       │   └── [planId]/
│       │       ├── route.ts              # DELETE: delete a plan (cascades)
│       │       ├── coherence-check/route.ts   # POST: deterministic + LLM coherence
│       │       ├── agent-prompt/route.ts      # GET: build scaffold prompt
│       │       ├── share/route.ts             # POST/GET/DELETE share links
│       │       └── export/
│       │           ├── json/route.ts          # GET: JSON download
│       │           └── markdown/route.ts       # GET: Markdown download
│       └── nodes/
│           └── [nodeId]/
│               ├── route.ts              # PATCH (edit/accept/reject) + DELETE node
│               ├── expand/route.ts       # POST: lazy expand a node
│               └── regenerate/route.ts   # POST: regenerate one node + change report
│
├── components/
│   ├── atoms/                            # Indivisible UI primitives
│   │   ├── logo.tsx
│   │   ├── status-badge.tsx
│   │   ├── metric-pill.tsx
│   │   ├── node-type-icon.tsx
│   │   └── section-label.tsx
│   ├── molecules/                        # Small compositions of atoms
│   │   └── node-row.tsx
│   ├── organisms/                        # Page-defining sections
│   │   ├── hero-background.tsx           # Animated particle/aurora canvas
│   │   ├── plan-tree.tsx                 # Left navigator
│   │   ├── node-inspector.tsx            # Detail pane + per-node actions
│   │   ├── node-content-view.tsx         # Pure renderer of an expanded node
│   │   ├── coherence-panel.tsx           # Runs + lists coherence warnings
│   │   ├── dashboard-plan-grid.tsx       # Plan cards with delete
│   │   └── share-viewer.tsx              # Read-only public viewer
│   ├── templates/                        # (reserved) layout scaffolds
│   └── ui/                               # shadcn/@base-ui primitives (owned in-repo)
│       ├── button.tsx  badge.tsx  card.tsx  dialog.tsx  sheet.tsx
│       ├── tabs.tsx  textarea.tsx  input.tsx  label.tsx  select.tsx
│       ├── dropdown-menu.tsx  scroll-area.tsx  accordion.tsx
│       ├── separator.tsx  skeleton.tsx  tooltip.tsx  alert.tsx
│       ├── table.tsx  sonner.tsx
│       └── …
│
├── features/                             # Feature-scoped controllers & UI
│   ├── auth/
│   │   ├── actions.ts                    # signInWithGoogle / signOut server actions
│   │   ├── sign-in-button.tsx            # Google-only sign-in button
│   │   └── user-menu.tsx                 # Avatar dropdown
│   ├── planner/
│   │   ├── planner-workspace.tsx         # The stateful controller for the whole planner
│   │   ├── brief-composer.tsx            # Brief input + framework picker + generate
│   │   ├── edit-node-dialog.tsx          # Structured node edit modal
│   │   ├── regenerate-dialog.tsx         # Regenerate instruction modal
│   │   └── types.ts                      # ClientNode / ClientPlan aliases
│   ├── export/
│   │   └── export-menu.tsx               # md / json / agent-prompt / share dropdown
│   └── usage/
│       └── usage-meter.tsx               # LLM usage/cost stat tiles
│
├── lib/                                  # Framework-agnostic logic
│   ├── utils.ts                          # cn() class merger
│   ├── api.ts                            # ok()/fail()/handler() response helpers
│   ├── auth.ts                           # getAuth()/requireUser()/HttpError
│   ├── sample-plan.ts                    # Built-in Kubernetes console sample
│   ├── supabase/
│   │   ├── client.ts                     # Browser client (publishable key)
│   │   └── server.ts                     # Server client (async cookies, RLS-scoped)
│   ├── db/
│   │   ├── types.ts                      # Row type definitions (mirror SQL)
│   │   ├── plan.ts                       # loadPlanBundle()
│   │   └── versions.ts                   # snapshotNode()
│   ├── llm/
│   │   ├── config.ts                     # Provider config + pricing (server-only)
│   │   ├── client.ts                     # callLLM / callStructured (retry + repair)
│   │   ├── prompts.ts                    # All planner prompts (anti-slop contract)
│   │   └── log.ts                        # logLLMEvent() telemetry
│   ├── validators/                       # Zod schemas = single source of truth
│   │   ├── primitives.ts                 # component/hook/context/dataModel/library/...
│   │   ├── plan.ts                       # planTree + generate input
│   │   ├── node.ts                       # nodeContent + statuses + patch + regenerate
│   │   └── coherence.ts                  # coherence warnings/report
│   └── export/
│       └── index.ts                      # buildMarkdown/buildJsonExport/buildAgentPrompt
│
├── supabase/
│   ├── COMBINED_SETUP.sql                # All migrations concatenated (paste in SQL editor)
│   └── migrations/
│       ├── 0001_schema.sql               # Tables + indexes
│       ├── 0002_triggers.sql             # Profile provisioning + updated_at
│       └── 0003_rls.sql                  # RLS policies + get_shared_plan RPC
│
├── docs/                                 # PRD, IMPLEMENTATION (this), SECURITY, AI_WORKFLOW, ...
│
├── proxy.ts                              # Next 16 "middleware": session relay + guard
├── middleware? (NO — renamed to proxy)
├── next.config.ts                        # Next config (minimal)
├── tsconfig.json                         # Strict TS + "@/*" path alias
├── eslint.config.mjs                     # ESLint flat config (next core-web-vitals)
├── postcss.config.mjs                    # Tailwind v4 postcss plugin
├── components.json                       # shadcn config
├── package.json                          # Scripts + dependencies
├── .env.example                          # Placeholder env (committed)
├── .env.local                            # Real env (gitignored)
└── README.md
```

### Why route groups?

The parentheses-named folders — `(marketing)`, `(auth)`, `(app)`, `(share)` — are **route groups**: they organize files without adding a URL segment. This lets us give the authenticated area (`(app)`) its own shared `layout.tsx` (header + user menu + auth guard) and its own `error.tsx`, while keeping the marketing page at `/` and the public share page outside the auth shell entirely. The grouping is what makes "every authed page has the header and is protected" a single declaration rather than something repeated per route.

---

## 5. End-to-end application flows

This section traces every major user action from click to database and back. Read it once and you understand how the whole system moves.

### 5.1 Authentication (Google OAuth, the only method)

```
Browser                     Next server (actions/route)        Supabase Auth          Google
   │                                  │                             │                    │
   │ click "Sign in with Google"      │                             │                    │
   │ (form action=signInWithGoogle)   │                             │                    │
   ├─────────────────────────────────►│                             │                    │
   │                                  │ supabase.auth.signInWith     │                    │
   │                                  │   OAuth({provider:'google',  │                    │
   │                                  │   redirectTo: APP/auth/cb})   │                    │
   │                                  ├────────────────────────────►│                    │
   │                                  │   returns data.url            │                    │
   │  redirect(data.url) ◄────────────┤                             │                    │
   │ ────────────────────────────────────────────────────────────────────────────────►  │ consent
   │                                  │                             │   ◄── code ────────┤
   │  GET /auth/callback?code=…       │                             │                    │
   ├─────────────────────────────────►│ exchangeCodeForSession(code)│                    │
   │                                  ├────────────────────────────►│ sets auth cookies   │
   │  redirect(/dashboard) ◄──────────┤                             │                    │
   │  (cookies now carry the session) │                             │                    │
```

Files involved:
- [`features/auth/sign-in-button.tsx`](../features/auth/sign-in-button.tsx) — the only sign-in entry point; a `<form action={signInWithGoogle}>`.
- [`features/auth/actions.ts`](../features/auth/actions.ts) — `signInWithGoogle()` server action builds the OAuth URL with `redirectTo = ${APP_URL}/auth/callback?next=/dashboard` and `redirect()`s to it.
- [`app/(auth)/auth/callback/route.ts`](../app/(auth)/auth/callback/route.ts) — exchanges the `code` for a session (cookies are written by the SSR client) and forwards to `/dashboard`.
- [`lib/supabase/server.ts`](../lib/supabase/server.ts) — the SSR client that reads/writes the cookies.
- [`supabase/migrations/0002_triggers.sql`](../supabase/migrations/0002_triggers.sql) — the `on_auth_user_created` trigger creates the `profiles` row on first sign-in.

On every subsequent request, [`proxy.ts`](../proxy.ts) refreshes the session cookie and, for protected paths (`/dashboard`, `/plans`), optimistically redirects unauthenticated users to `/`. The authoritative check is still server-side: `(app)/layout.tsx` calls `getAuth()` and redirects if there is no user, and each API route calls `requireUser()`.

### 5.2 Generating a plan (lazy, route-level)

```
BriefComposer (client)            /api/plans/generate           Groq            Supabase (RLS)
   │ user types brief + framework         │                       │                  │
   │ POST {brief, targetFramework}        │                       │                  │
   ├─────────────────────────────────────►│ requireUser() ────────────────────────► (validate JWT)
   │                                       │ Zod: generatePlanInputSchema             │
   │                                       │ callStructured(planTreeSchema,           │
   │                                       │   planTreePrompt(brief, framework))      │
   │                                       ├──────────────────────►│ JSON (json mode) │
   │                                       │  parse + Zod safeParse │                  │
   │                                       │  (1 repair retry if invalid)             │
   │                                       │ INSERT plans(owner_id, title, brief, …)  │
   │                                       ├─────────────────────────────────────────►│
   │                                       │ INSERT plan_nodes  (one per route)       │
   │                                       ├─────────────────────────────────────────►│
   │                                       │ logLLMEvent(...)                          │
   │  { planId } ◄─────────────────────────┤                                          │
   │ router.push(`/plans/${planId}`)       │                                          │
```

Key point: only **route nodes** are inserted, each with `expanded:false` and `content = {purpose, primaryUsers, requiredData, initialDependencies}`. No component-level rows yet. Cost is tiny and proportional to the number of pages, not the whole app.

Files: [`features/planner/brief-composer.tsx`](../features/planner/brief-composer.tsx) → [`app/api/plans/generate/route.ts`](../app/api/plans/generate/route.ts) → [`lib/llm/client.ts`](../lib/llm/client.ts) + [`lib/llm/prompts.ts`](../lib/llm/prompts.ts) + [`lib/validators/plan.ts`](../lib/validators/plan.ts) → [`lib/llm/log.ts`](../lib/llm/log.ts).

### 5.3 Drilling in — lazy node expansion

```
NodeInspector "Expand"        PlannerWorkspace.expand()      /api/nodes/[id]/expand      Groq      DB
   │ click Expand                     │                              │                     │        │
   │                                  │ POST /expand (?force if re)  │                     │        │
   │                                  ├─────────────────────────────►│ requireUser()        │        │
   │                                  │   show skeletons             │ fetch node + plan +  │        │
   │                                  │                              │   siblings           │        │
   │                                  │                              │ if expanded & !force │        │
   │                                  │                              │   → return cached    │        │
   │                                  │                              │ callStructured(      │        │
   │                                  │                              │   nodeContentSchema, │        │
   │                                  │                              │   expandNodePrompt)  │        │
   │                                  │                              ├────────────────────►│        │
   │                                  │                              │ UPDATE node.content, │        │
   │                                  │                              │   expanded=true,     │        │
   │                                  │                              │   status=needs_review├───────►│
   │                                  │                              │ snapshotNode(...)     ├───────►│
   │                                  │                              │ logLLMEvent(...)      │        │
   │   replace(node) ◄────────────────┤◄─────────────────────────────┤ { node, cached }    │        │
```

The inspector shows **skeletons** while the call is in flight (latency hiding). The expanded content is cached on the node; re-expanding requires `?force=1`. Each expansion writes an immutable **version snapshot**.

Files: [`components/organisms/node-inspector.tsx`](../components/organisms/node-inspector.tsx) → [`features/planner/planner-workspace.tsx`](../features/planner/planner-workspace.tsx) → [`app/api/nodes/[nodeId]/expand/route.ts`](../app/api/nodes/[nodeId]/expand/route.ts) → [`lib/db/versions.ts`](../lib/db/versions.ts).

### 5.4 Editing, accepting, rejecting

All three are a single `PATCH /api/nodes/[nodeId]`:

- **Accept** → `{ status: "accepted" }`.
- **Reject** → `{ status: "rejected", rejectionReason? }` (reason captured via a prompt, stored in `content.rejectionReason`).
- **Edit** → `{ title?, routePath?, content?: partial }`. A content change sets status to `edited` and writes a version snapshot.

The route validates the body with `patchNodeInputSchema`, merges content (`{...existing, ...patch}`), updates the row, and snapshots when content changed.

Files: [`features/planner/edit-node-dialog.tsx`](../features/planner/edit-node-dialog.tsx) + [`features/planner/planner-workspace.tsx`](../features/planner/planner-workspace.tsx) → [`app/api/nodes/[nodeId]/route.ts`](../app/api/nodes/[nodeId]/route.ts).

### 5.5 Regenerating one node (without breaking the rest)

```
RegenerateDialog            PlannerWorkspace.regenerate()   /api/nodes/[id]/regenerate    Groq
   │ instruction (optional)        │                              │                          │
   │                               │ POST {instruction}           │                          │
   │                               ├─────────────────────────────►│ requireUser()            │
   │                               │                              │ fetch node + plan +      │
   │                               │                              │   dependents (edges)     │
   │                               │                              │ callStructured(          │
   │                               │                              │   regenerateOutputSchema,│
   │                               │                              │   regenerateNodePrompt)  │
   │                               │                              ├─────────────────────────►│
   │                               │                              │ UPDATE node.content,     │
   │                               │                              │   status=regenerated     │
   │                               │                              │ if staleDependents →     │
   │                               │                              │   mark edges stale       │
   │                               │                              │ snapshot + logLLMEvent   │
   │ replace(node);                │                              │ {node, changedFields,    │
   │ mark named dependents stale ◄─┤◄─────────────────────────────┤  staleDependents, ...}   │
```

The prompt receives only a **constrained context** — plan summary, the node, and recorded dependents — never the entire tree. The response includes an explicit **change report** (`changedFields`, `newDependencies`, `staleDependents`, `rationale`). The client uses `staleDependents` to flag sibling nodes in place, so the tree visibly reflects the ripple instead of silently rotting.

Files: [`features/planner/regenerate-dialog.tsx`](../features/planner/regenerate-dialog.tsx) → [`app/api/nodes/[nodeId]/regenerate/route.ts`](../app/api/nodes/[nodeId]/regenerate/route.ts) → [`lib/validators/node.ts`](../lib/validators/node.ts) (`regenerateOutputSchema`).

### 5.6 Coherence checking

```
CoherencePanel "Run check"     /api/plans/[id]/coherence-check        Groq (optional)
   │ POST {llm:true}                   │                                   │
   │                                   │ requireUser(); load plan+nodes+deps
   │                                   │ DETERMINISTIC:
   │                                   │   • broken/stale dependency edges
   │                                   │   • nodes flagged stale_dependency
   │                                   │   • required data with no matching global model
   │                                   │ OPTIONAL LLM slop pass:
   │                                   │   callStructured(coherenceReportSchema, coherencePrompt)
   │                                   ├──────────────────────────────────►│
   │  { warnings:[...] } ◄─────────────┤  merge deterministic + LLM warnings
   │ render; click a warning → jump to node
```

The deterministic checks always run and never fail; the LLM pass is best-effort (wrapped in try/catch) so a model hiccup can't block the useful checks.

Files: [`components/organisms/coherence-panel.tsx`](../components/organisms/coherence-panel.tsx) → [`app/api/plans/[planId]/coherence-check/route.ts`](../app/api/plans/[planId]/coherence-check/route.ts) → [`lib/validators/coherence.ts`](../lib/validators/coherence.ts).

### 5.7 Exports & sharing

- **Markdown** (`GET …/export/markdown`) and **JSON** (`GET …/export/json`) stream a downloadable file (`Content-Disposition: attachment`).
- **Agent prompt** (`GET …/agent-prompt`) returns a paste-ready scaffolding prompt; the UI copies it to the clipboard and shows it in a dialog.
- **Share** (`POST …/share`) creates a `share_links` row with a random 64-hex token and returns a public URL.

All three read the plan via `loadPlanBundle()` and transform it with the pure builders in `lib/export/index.ts`.

The public share page (`/share/[token]`) does **not** query the tables directly. It calls the `get_shared_plan(token)` Postgres RPC (SECURITY DEFINER), which returns the plan only if the token is active and unexpired, with `owner_id` stripped. The special token `sample` short-circuits to a built-in plan with no DB access at all.

Files: [`features/export/export-menu.tsx`](../features/export/export-menu.tsx) → export routes → [`lib/export/index.ts`](../lib/export/index.ts) + [`lib/db/plan.ts`](../lib/db/plan.ts); [`app/(share)/share/[token]/page.tsx`](../app/(share)/share/[token]/page.tsx) → [`components/organisms/share-viewer.tsx`](../components/organisms/share-viewer.tsx) + [`lib/sample-plan.ts`](../lib/sample-plan.ts).

---

## 6. The data model & database deep-dive

Seven tables, all in the `public` schema, all owner-scoped. The schema lives in [`supabase/migrations/0001_schema.sql`](../supabase/migrations/0001_schema.sql); triggers in `0002`; RLS in `0003`. The concatenation [`COMBINED_SETUP.sql`](../supabase/COMBINED_SETUP.sql) is what gets pasted into the Supabase SQL editor (or applied via the Supabase MCP / CLI). All migrations are **idempotent** (`create table if not exists`, `create or replace function`, `drop trigger if exists`).

### 6.1 `profiles`

```sql
profiles (
  id          uuid PK references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
)
```

One row per authenticated user. **Not** written by the client — it is provisioned by the `handle_new_user()` trigger that fires `after insert on auth.users`. The trigger is `SECURITY DEFINER` with `search_path = ''` so it can write to `public.profiles` regardless of the inserting role, safely. On conflict it updates email/name/avatar (so re-logins keep the profile fresh). RLS allows a user to `select`/`update` only `where id = auth.uid()`; there is deliberately **no client INSERT policy** because inserts only happen through the trigger.

### 6.2 `plans`

```sql
plans (
  id               uuid PK default gen_random_uuid(),
  owner_id         uuid NOT NULL references auth.users(id) on delete cascade,
  title            text NOT NULL,
  brief            text NOT NULL,
  target_framework text NOT NULL default 'nextjs',
  status           text NOT NULL default 'draft',
  plan_summary     jsonb NOT NULL default '{}',
  created_at, updated_at timestamptz
)
```

A single planning session. `brief` is the user's original natural-language input. `plan_summary` (jsonb) holds the **global layer** returned by the first LLM call: the title, summary, the route list, `globalDataModels`, `globalContexts`, `globalLibraries`, and `risks`. Keeping the summary on the plan (rather than reconstructing it from nodes) means the regenerate/expand prompts can cheaply include "here is the whole product in two sentences + the global models" as context without re-reading every node.

### 6.3 `plan_nodes` — the tree

```sql
plan_nodes (
  id          uuid PK,
  plan_id     uuid → plans(id) on delete cascade,
  owner_id    uuid → auth.users(id) on delete cascade,
  parent_id   uuid → plan_nodes(id) on delete cascade,   -- self-reference
  node_type   text default 'route',
  title       text NOT NULL,
  route_path  text,
  status      text default 'draft',
  depth       int default 0,
  sort_order  int default 0,
  content     jsonb default '{}',     -- the atomic decomposition lives here
  llm_context jsonb default '{}',
  expanded    boolean default false,
  created_at, updated_at
)
indexes: (plan_id), (parent_id), (owner_id)
```

This is the heart of the model. **Top-level nodes are routes** (`parent_id = null`, `node_type = 'route'`, `depth = 0`). The crucial design decision: a page's atomic decomposition is **not** stored as a row-per-component; it is stored as one **validated JSON document** in `content`. When a node is expanded, `content` is filled with `{atoms[], molecules[], organisms[], templates[], hooks[], contexts[], dataModels[], mockData[], assets[], libraries[], edgeCases[], acceptanceCriteria[]}` and `expanded` flips to `true`.

Why content-in-jsonb instead of child rows? See §20 for the full trade-off, but in short: the unit the user acts on (accept/reject/regenerate/version) is the **page**, so its decomposition is naturally one document — simpler coherence, one snapshot per change, fewer round-trips, and the model produces one coherent page at a time. The `parent_id`/`depth`/`node_type` columns exist so that promoting components to addressable child nodes later is a non-breaking change.

`status` is one of the seven lifecycle states (see §6.8). `llm_context` is reserved for caching the exact context used to generate a node.

### 6.4 `node_dependencies` — the coherence edges

```sql
node_dependencies (
  id, plan_id, owner_id,
  source_node_id uuid → plan_nodes(id),
  target_node_id uuid → plan_nodes(id),
  dependency_type text default 'data',
  status text default 'ok',        -- ok | stale | broken
  reason text,
  created_at
)
```

Explicit edges between nodes, used by the coherence checker. When a node is **regenerated** and the model reports `staleDependents`, edges targeting that node are set to `status = 'stale'`. When a node is **deleted**, the source nodes of edges pointing at it are flagged `stale_dependency`. This is the mechanism behind "regenerate one node shouldn't silently invalidate the rest."

### 6.5 `plan_versions` — immutable history

```sql
plan_versions (
  id, plan_id, owner_id,
  node_id uuid → plan_nodes(id) on delete set null,   -- null = plan-level
  version_number int NOT NULL,                          -- per-plan, monotonic
  snapshot jsonb NOT NULL,
  reason text,
  created_at
)
```

Every expand / edit / regenerate writes a snapshot here via `snapshotNode()`. `version_number` is computed as `(count of versions for this plan) + 1`. This gives a complete audit trail and is the data foundation for a future undo/redo (deferred — see §21). `on delete set null` for `node_id` means deleting a node keeps its history.

### 6.6 `llm_events` — usage & cost telemetry

```sql
llm_events (
  id, plan_id, node_id, owner_id,
  provider text, model text, operation text,
  input_tokens int, output_tokens int,
  cost_estimate numeric(12,6),
  latency_ms int,
  success boolean, error_message text,
  created_at
)
indexes: (plan_id), (owner_id)
```

One row **per model call**, success or failure. `operation` is `generate_plan | expand_node | regenerate_node | coherence_check`. This table powers the dashboard usage meter (aggregated by the dashboard server component) and makes cost visible per plan. Crucially, failures are logged too — the `LLMError` carries usage so we record cost even when the call ultimately failed.

### 6.7 `share_links` — read-only public tokens

```sql
share_links (
  id, plan_id, owner_id,
  token text UNIQUE NOT NULL,
  is_active boolean default true,
  expires_at timestamptz,        -- nullable
  created_at
)
index: (token)
```

A token grants read-only access to a plan. The token is 64 hex chars (`crypto.randomUUID()` × 2, dashes stripped). Reads do not go through these RLS policies at all — see §7.3.

### 6.8 Node lifecycle states

`status` (validated by `nodeStatus` in `lib/validators/node.ts`) is one of:

| Status | Meaning | Set by |
|---|---|---|
| `draft` | Created but not reviewed | generate (route nodes) |
| `needs_review` | Expanded, awaiting user judgment | expand |
| `accepted` | User approved | PATCH accept |
| `rejected` | User rejected (reason in content) | PATCH reject |
| `edited` | User manually changed content/title | PATCH edit |
| `regenerated` | Content replaced by a fresh LLM call | regenerate |
| `stale_dependency` | A thing it depends on changed/was removed | delete/regenerate ripple |

Each status maps to a colored badge in `components/atoms/status-badge.tsx`.

### 6.9 Entity relationships

```
auth.users ──1:1── profiles
auth.users ──1:N── plans ──1:N── plan_nodes ──self─┐ (parent_id)
                     │              │  ▲────────────┘
                     │              ├─ node_dependencies (source/target → plan_nodes)
                     │              └─ plan_versions (node_id nullable)
                     ├─ llm_events
                     └─ share_links
```

`on delete cascade` from `plans` means deleting a plan cleans up all of its nodes, versions, dependencies, events, and share links in one statement — which is exactly what `DELETE /api/plans/[planId]` relies on.

---

## 7. The security model

The threat that matters for a multi-tenant SaaS is **one user reading or writing another user's data**, plus **leaking secrets to the browser**. Both are addressed structurally, not by hoping the application code is correct. The full rationale is in [`docs/SECURITY.md`](SECURITY.md); here is how it manifests in code.

### 7.1 Authentication

Google OAuth is the **only** path. There is no email/password UI, no password reset, no magic link — nothing to secure on that surface. `proxy.ts` keeps the session fresh and does an optimistic redirect for `/dashboard` and `/plans`; the authoritative checks are `(app)/layout.tsx`'s `getAuth()` redirect and every API route's `requireUser()` (which throws `HttpError(401)`).

### 7.2 Row Level Security on every table

All seven tables have `enable row level security`. The policies are uniform:

- `profiles`: `select`/`update` where `auth.uid() = id`.
- everything else: `FOR ALL using (auth.uid() = owner_id) with check (auth.uid() = owner_id)`.

The application connects with the **publishable/anon key + the user's JWT** (carried in cookies and forwarded by the SSR client). So `auth.uid()` is the real authenticated user, and **no policy permits cross-user reads or public writes.** A logic bug in a handler cannot leak data because the database itself refuses any row where `owner_id != auth.uid()`.

### 7.3 Read-only sharing without opening the tables

Anonymous visitors have **no** select grant on `plans` or `plan_nodes`. Sharing works through a single `SECURITY DEFINER` function:

```sql
create function public.get_shared_plan(p_token text) returns jsonb
  language plpgsql security definer set search_path = '' as $$ … $$;
grant execute on function public.get_shared_plan(text) to anon, authenticated;
```

It returns a plan **only** if a matching `share_links` row is `is_active` and unexpired, and it strips `owner_id` (and `llm_context`) from the payload. There is no write path. Tokens are unguessable. This is the cleanest way to expose read-only data without widening table grants. (Supabase's linter flags it as "anon can execute a SECURITY DEFINER function" — that is **intentional and documented**: it is the share mechanism, and it is the narrowest possible surface.)

### 7.4 No service-role on the request path

`SUPABASE_SERVICE_ROLE_KEY` exists in the env table but the application **never** uses it to serve a request. `lib/supabase/server.ts` builds the client with the anon key + the user's cookies. The service-role key is documented as "server-only, optional, for offline admin scripts" and nothing in `app/` or `lib/` references it. This means there is no code path that bypasses RLS.

### 7.5 Server-only secrets

The LLM key and base URL are read in `lib/llm/config.ts`, which begins with `import "server-only"`. Any attempt to import it (transitively) into a client bundle fails the build. Every LLM call runs inside a route handler. The browser never sees the key.

### 7.6 Input & output validation, error hygiene

- Every request body is validated with a Zod schema before it touches the database.
- Every LLM response is validated with a Zod schema before it is persisted.
- The `handler()` wrapper in `lib/api.ts` converts thrown errors into clean JSON (`401/400/502/500`) so **stack traces never leak** to clients.
- `SECURITY DEFINER` functions pin `search_path = ''` to prevent search-path hijacking.

### 7.7 Secret handling in the repo

`.env.local` is gitignored; `.env.example` ships placeholders only. The git history was scanned for secrets before every push (a `git ls-files | xargs grep -lE '<secret patterns>'` gate). The home directory's `.gitignore` was hardened early because the machine's git repo was rooted at `$HOME` — a separate, isolated repo was created for the app to avoid ever committing dotfile secrets.

---

## 8. LLM orchestration deep-dive

This is the part graded on "structured outputs, error handling, cost awareness, retries, latency hiding." Four files do the work: `config.ts`, `client.ts`, `prompts.ts`, `log.ts`, plus the validators.

### 8.1 Provider configuration — `lib/llm/config.ts`

Server-only. Reads `LLM_PROVIDER`, `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` from the environment with sensible Groq defaults. Exposes a `PRICING` table (USD per 1M tokens, per model) and `estimateCost(model, inTokens, outTokens)` used to fill `llm_events.cost_estimate`. `isLLMConfigured()` lets routes return a clean `503` if no key is present rather than throwing deep in a fetch.

The provider is intentionally an **OpenAI-compatible** endpoint, so switching from Groq to OpenAI/Anthropic/Gemini is a base-URL + key change, not a code rewrite.

### 8.2 The transport — `lib/llm/client.ts`

Two exported functions and a typed error.

**`callLLM(messages, opts)`** — one chat-completion against `${baseUrl}/chat/completions`:
- `response_format: { type: "json_object" }` (JSON mode on).
- Low temperature (0.2–0.5 depending on operation) for determinism.
- **Retry loop**: up to `retries` (default 2) attempts. On HTTP `429` or `>= 500`, it backs off (`400ms × attempt`) and retries; on other non-OK statuses it throws immediately (no point retrying a 400).
- Always returns `usage` — `{provider, model, inputTokens, outputTokens, costEstimate, latencyMs}` — computed from the provider's `usage` field and `estimateCost`. On total failure it throws an `LLMError` that **still carries usage**, so the caller can log cost/latency for the failed attempt.

**`callStructured(schema, messages, opts)`** — the structured-output workhorse:
1. Calls `callLLM`.
2. `extractJson()` pulls JSON out of the response (handles fenced code blocks and slices from the first `{` to the last `}` — defensive against the model wrapping JSON in prose despite JSON mode).
3. `schema.safeParse(JSON.parse(...))`.
4. **If it fails, one repair call**: the original messages + the bad assistant output + a user message quoting the exact Zod error and demanding corrected JSON only. Usage from both calls is summed.
5. If the repair still fails, it throws `LLMError` with combined usage.

This is the "retries + JSON repair + never write bad data" guarantee in ~180 lines.

### 8.3 The prompts — `lib/llm/prompts.ts`

Server-only. Exposes prompt builders: `planTreePrompt`, `expandNodePrompt`, `regenerateNodePrompt`, `coherencePrompt`. They share an `ANTI_SLOP` system fragment that:

- demands product-specific output (nothing that would fit any app),
- requires a concrete **reason** per component **and** a justification for its atomic level,
- defines atoms/molecules/organisms/templates with **named examples**,
- explicitly bans "Button under every page" and filler words ("modern", "scalable", "user-friendly", "seamless", "robust", "powerful") unless immediately followed by a concrete spec,
- requires a single valid JSON object, no markdown.

Each builder returns an array of `{role, content}` messages with the exact JSON shape spelled out inline, so the model has a literal template to fill. The split between `planTreePrompt` (routes + global layer only) and `expandNodePrompt` (one page) is what keeps the model focused and the output sharp. See [`docs/AI_WORKFLOW.md`](AI_WORKFLOW.md) §4 for how these were tuned (what failed, what landed).

### 8.4 Telemetry — `lib/llm/log.ts`

`logLLMEvent(supabase, {ownerId, planId, nodeId, operation, usage, success, error})` inserts one `llm_events` row. It is wrapped in try/catch and **never throws** — a telemetry failure must not break the user's actual request. Every route calls it on both the success and failure paths.

### 8.5 Validation as the contract — `lib/validators/`

- `primitives.ts` — the atomic building blocks (`componentSchema` with `atomicLevel` + `reason`, `hookSchema` with `input`/`output`, `contextSchema`, `dataModelSchema`, `mockRecordSchema`, `assetSchema`, `librarySchema`).
- `plan.ts` — `planTreeSchema` (routes, global models/contexts/libraries, risks) + `generatePlanInputSchema` (brief length bounds + framework enum).
- `node.ts` — `nodeContentSchema` (the full expanded payload, requires ≥1 acceptance criterion), `nodeStatus` enum, `regenerateOutputSchema` (content + change report), `patchNodeInputSchema`.
- `coherence.ts` — `coherenceWarningSchema` (severity + kind + nodeId + message + suggestion) and `coherenceReportSchema`.

Because the TypeScript types are inferred from these, the same definitions that constrain the model also type the database rows and the React props.

### 8.6 Cost awareness in practice

- **Lazy generation** means most plans cost a single small `generate` call until the user drills in.
- **Constrained context** for regenerate/expand means we never resend the entire tree.
- **Caching**: an expanded node returns cached content unless `?force=1`.
- **Visible cost**: the dashboard aggregates `llm_events` into estimated cost, call count, tokens, and average latency.

---

## 9. Atomic component architecture

The repo mirrors the decomposition the tool teaches. The hierarchy:

- **Atoms** (`components/atoms/`) — indivisible UI. No layout of other domain components, no data fetching. Examples here: `StatusBadge`, `MetricPill`, `NodeTypeIcon`, `SectionLabel`, `Logo`.
- **Molecules** (`components/molecules/`) — small compositions of atoms with a single responsibility. Example: `NodeRow` (icon + title + route + status badge + expanded indicator).
- **Organisms** (`components/organisms/`) — page-defining sections that compose molecules/atoms and may hold local UI state. Examples: `PlanTree`, `NodeInspector`, `CoherencePanel`, `DashboardPlanGrid`, `ShareViewer`, `HeroBackground`, `NodeContentView`.
- **Templates** (`components/templates/`) — reserved for pure layout scaffolds. In this build, the layout responsibility is carried by `app/(app)/layout.tsx` and the `PlannerWorkspace` controller, so the folder exists as the documented home for future extraction.
- **`components/ui/`** — the shadcn/@base-ui primitives. These are **owned in-repo** (copied, not imported from a package) so we control their markup and styling. They are the lowest layer the atoms build on.
- **`features/`** — feature-scoped controllers that orchestrate organisms and talk to the API. The big one is `PlannerWorkspace`, which owns the planner's state and wires every node action.

The dependency direction is strict and one-way: `features` → `organisms` → `molecules` → `atoms` → `ui`. Nothing lower imports something higher. `lib/` is imported by everything and imports nothing from the UI layers.

### Why this matters for grading

The brief explicitly says: "you can't preach atomic decomposition in the tool and not practice it." So when a reviewer opens, say, `node-row.tsx`, they should see a molecule that composes two atoms (`NodeTypeIcon`, `StatusBadge`) and nothing more — proof the discipline is real, not a folder-name veneer.

---

## 10. File-by-file reference: `lib/`

`lib/` is the framework-agnostic core. None of it renders UI; all of it is pure logic, validation, data access, or LLM orchestration.

### `lib/utils.ts` (6 lines)

```ts
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

The single class-composition helper used everywhere. `clsx` resolves conditional/array class inputs; `tailwind-merge` then de-duplicates conflicting Tailwind utilities (so `cn("p-2", "p-4")` yields `p-4`). Every component's `className` prop flows through this.

### `lib/api.ts` (30 lines)

Response helpers for route handlers:
- `ok(data, init?)` → `NextResponse.json(data, init)`.
- `fail(status, message, extra?)` → `NextResponse.json({error, detail?}, {status})`.
- `handler(fn)` → wraps an async route handler so thrown errors become clean JSON: `HttpError` → its status; `LLMError` → `502`; anything else is logged server-side and returns a generic `500`. **This is why stack traces never leak** — every API route is exported as `export const POST = handler(async (...) => {...})`.

### `lib/auth.ts` (33 lines)

The auth surface for server code:
- `getAuth()` → `{ supabase, user }`; builds the SSR client and calls `supabase.auth.getUser()`. `user` is `null` when unauthenticated. Used by server components (e.g. `(app)/layout.tsx`, the marketing page).
- `HttpError(status, message)` — a typed error the `handler()` wrapper understands.
- `requireUser()` → `getAuth()` then throws `HttpError(401)` if there is no user. Every protected API route starts with `const { supabase, user } = await requireUser();`.

The key property: `requireUser()` returns the **RLS-scoped** Supabase client, so everything the route does afterward is already constrained to the current user.

### `lib/sample-plan.ts` (218 lines)

A hand-authored, fully-expanded **Kubernetes Workload Console** plan, typed as `{ plan: PlanRow; nodes: PlanNodeRow[] }`. It exists so the marketing "View a sample plan" CTA and `/share/sample` work with **zero database dependency** — a visitor (even logged out, even before the DB is provisioned) can see exactly what the tool produces. Two routes (`/workloads`, `/workloads/[id]`) are decomposed in full (atoms→organisms, hooks with I/O, data shapes, realistic nested mock data, libraries with reasons, edge cases, acceptance criteria); the rest are route-level. The same content is mirrored in `docs/SAMPLE_PLAN.md`. Small `c()` and `route()`/`expandedWorkloads()` helpers keep the data terse and consistent.

### `lib/supabase/client.ts` (13 lines)

```ts
export function createClient() {
  return createBrowserClient(URL, ANON_KEY);
}
```

The **browser** Supabase client. Uses only the publishable key — safe to ship. Everything it does is constrained by RLS. Used by client components that need to talk to Supabase directly (kept minimal; most mutations go through API routes).

### `lib/supabase/server.ts` (34 lines)

The **server** client, bound to the request's cookies (Next 16: `await cookies()`). It runs as the signed-in user (publishable key + the user's JWT in cookies) so RLS applies to every query. The `setAll` cookie writer is wrapped in try/catch because Server Components cannot set cookies — those writes are handled by `proxy.ts` on the next request. **This file deliberately does not use the service-role key.**

### `lib/db/types.ts` (73 lines)

Hand-written TypeScript row types mirroring the SQL schema: `PlanRow`, `PlanNodeRow`, `NodeDependencyRow`, `LlmEventRow`, `ShareLinkRow`. `PlanNodeRow.content` is typed as `Partial<NodeContent> & Record<string, unknown>` (content is a flexible jsonb document), and `PlanRow.plan_summary` as `Partial<PlanTree>`. These types are imported by both server code (`lib/db/plan.ts`, export builders) and client code (`features/planner/types.ts` re-exports them as `ClientNode`/`ClientPlan`) — safe because they're pure types with no runtime/server imports.

### `lib/db/plan.ts` (37 lines)

Server-only. `loadPlanBundle(supabase, planId)` → `{ plan, nodes, dependencies } | null`. Three queries (plan, nodes ordered by `sort_order`, dependencies) under RLS. This is the single loader used by the planner page, all three export routes, and the agent-prompt route — so the "shape of a plan in memory" is defined in exactly one place.

### `lib/db/versions.ts` (31 lines)

Server-only. `snapshotNode(supabase, {planId, ownerId, nodeId, snapshot, reason})`. Counts existing versions for the plan, then inserts a `plan_versions` row with `version_number = count + 1`. Called by expand, regenerate, and edit. The monotonic per-plan numbering is intentional (human-readable history) rather than a global sequence.

### `lib/llm/config.ts` (32 lines)

Covered in §8.1. Server-only provider config + pricing + `estimateCost` + `isLLMConfigured`.

### `lib/llm/client.ts` (182 lines)

Covered in §8.2. `callLLM` (retry/backoff, usage accounting) and `callStructured` (parse + Zod + one repair). Also exports the `LLMError` class (carries usage) and the `LLMMessage`/`LLMUsage`/`LLMResult` types.

### `lib/llm/prompts.ts` (197 lines)

Covered in §8.3. The `ANTI_SLOP` contract and the four prompt builders. Each builder takes the minimal context it needs (e.g. `expandNodePrompt` takes a plan summary, the route, and **only the siblings' titles/paths** — not their full content — to keep tokens low while still enabling consistent naming).

### `lib/llm/log.ts` (40 lines)

Covered in §8.4. Best-effort `logLLMEvent` that never throws.

### `lib/validators/primitives.ts` (79 lines)

The atomic Zod schemas. Highlights:
- `atomicLevel = z.enum(["atom","molecule","organism","template"])`.
- `componentSchema` requires `name`, `atomicLevel`, `filePath`, `purpose`, and **`reason`** (the anti-slop guard for "why this level"), with optional `props`/`dependsOn` defaulting to `[]`.
- `hookSchema` requires `input` and `output` (so a hook is specified, not named).
- `dataModelSchema` requires ≥1 typed `field`.
- Types inferred and exported (`Component`, `Hook`, `Context`, `DataModel`, `Asset`, `Library`, `MockRecord`).

### `lib/validators/plan.ts` (43 lines)

`routeSummarySchema`, `planTreeSchema` (≥2 routes), and `generatePlanInputSchema` (`brief` 8–4000 chars with a friendly min-length message, `targetFramework` enum `nextjs|react|vue` default `nextjs`). The min-length message is what the UI surfaces if a user submits a one-word brief.

### `lib/validators/node.ts` (67 lines)

`nodeContentSchema` (the full expanded payload; `acceptanceCriteria` must have ≥1 entry — a node with no testable criteria is rejected), `nodeStatus`, `regenerateOutputSchema` (content + `changedFields`/`newDependencies`/`staleDependents`/`rationale`), and `patchNodeInputSchema` (all-optional edit payload with `content` as a `.partial()`).

### `lib/validators/coherence.ts` (28 lines)

`coherenceWarningSchema` with a `kind` enum (`broken_dependency | stale_dependency | missing_data_model | route_data_mismatch | orphaned_component | generic_slop | other`) and `severity` (`info|warning|error`), plus `coherenceReportSchema`.

### `lib/export/index.ts` (181 lines)

Pure, server-importable transformers from a plan bundle to deliverables:
- `buildJsonExport(bundle)` → a clean, machine-readable object (plan + nodes with content + dependencies).
- `buildMarkdown(bundle)` → an engineer-readable spec: title, brief, global data models (as tables), global libraries, then per-route sections with component tables (Atom/Molecule/Organism/Template, each as `| name | file | purpose | why this level |`), hooks (with I/O), contexts, data shapes, libraries, edge cases, and acceptance criteria as checkboxes.
- `buildAgentPrompt(bundle)` → a paste-ready scaffolding prompt for Claude Code / Cursor: product summary, shared data models as TS-like types, a per-route component/hook/context/acceptance breakdown with file paths, and a 5-phase implementation plan.

These are deterministic (no LLM) because the data is already structured — turning it into Markdown or a prompt is a formatting job, which is cheaper and more reliable than another model call.

---

## 11. File-by-file reference: `supabase/` & root config

### `supabase/migrations/0001_schema.sql` (134 lines)

Enables `pgcrypto`, creates the seven tables with their columns, defaults, foreign keys (all `on delete cascade` to the owner/plan), and indexes. Heavily commented so the schema reads as documentation.

### `supabase/migrations/0002_triggers.sql` (58 lines)

- `handle_new_user()` — `SECURITY DEFINER`, `search_path = ''`; inserts/updates a `profiles` row from `auth.users.raw_user_meta_data` (handles both `full_name` and `name` keys from Google). Wired with `create trigger on_auth_user_created after insert on auth.users`.
- `touch_updated_at()` — sets `new.updated_at = now()`; attached as a `before update` trigger on `plans`, `plan_nodes`, and `profiles`.
- A later hardening migration pins `search_path` on `touch_updated_at` and revokes REST execute on both trigger functions (they should fire from triggers, not be callable as RPCs).

### `supabase/migrations/0003_rls.sql` (84 lines)

Enables RLS on all seven tables, creates the uniform owner-scoped policies, and defines `get_shared_plan(p_token text)` (the SECURITY DEFINER share reader) with `revoke all … from public` + `grant execute … to anon, authenticated`. Covered in §7.

### `supabase/COMBINED_SETUP.sql` (276 lines)

The three migrations concatenated, for one-paste setup in the Supabase SQL editor. Idempotent.

### `proxy.ts` (57 lines)

The Next 16 "middleware." Exports `proxy(request)` and `config.matcher`. It:
1. Creates a server Supabase client wired to the request/response cookies (the canonical SSR cookie-relay pattern, adapted to the `proxy` signature).
2. Calls `supabase.auth.getUser()` to refresh the session.
3. For paths under `/dashboard` or `/plans`, redirects to `/?auth=required` if there is no user (optimistic; the real gate is server-side).
4. The `matcher` excludes static assets and image files so the proxy doesn't run on every `.png`.

A comment in the file explicitly notes that this is **optimistic UX only** and that authorization is enforced by RLS + `requireUser()` — important context for a reviewer.

### `app/globals.css` (282 lines)

The Tailwind v4 entry (`@import "tailwindcss"`) plus:
- the shadcn token layer (`@theme inline`, `:root`/`.dark` CSS variables),
- the **brand override**: a `.dark` block setting true-black surfaces, an electric-blue `--primary` (oklch ≈ #3B82F6), and tuned chart/sidebar tokens (the app is forced into dark mode by `html.dark` in the root layout),
- utilities: `.glass` (backdrop blur header), `.grid-bg` (masked technical grid), `.text-gradient` / `.text-gradient-blue` (gradient text), `.aurora` (blurred animated blobs), `.card-glow` (hover lift + glow), `.animate-fade-up` / `.animate-rise`,
- keyframes: `fade-up`, `rise`, `aurora-drift`, `aurora-drift-2`, `sheen`,
- a `prefers-reduced-motion` block that disables aurora + reveal animations,
- a scoped transition rule on `a, button, .card-glow, [data-slot=button]` (color/border/shadow only — deliberately **not** opacity/transform, so base-ui's own open/close animations are not double-driven).

### `app/layout.tsx` (30 lines)

The root layout. Loads Geist Sans/Mono, forces `className="dark"` + `style={{colorScheme:"dark"}}` on `<html>`, sets the document `metadata`, and mounts the `<Toaster>` (sonner) once for the whole app. Everything renders inside it.

### `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `components.json`, `package.json`

- `next.config.ts` — minimal; no custom webpack (Turbopack default).
- `tsconfig.json` — `strict: true`, `moduleResolution: bundler`, and the `"@/*": ["./*"]` path alias used by every import.
- `eslint.config.mjs` — flat config extending `next/core-web-vitals` + `next/typescript`.
- `postcss.config.mjs` — the `@tailwindcss/postcss` plugin (Tailwind v4).
- `components.json` — shadcn config (style, base color, path aliases) so `npx shadcn add` drops files in the right place.
- `package.json` — scripts (`dev`, `build`, `start`, `lint`, `typecheck`) and the dependency set from §2.

---

## 12. File-by-file reference: `components/`

### Atoms

**`components/atoms/status-badge.tsx` (36 lines)** — Maps a node `status` string to a colored, uppercase pill via a `STYLES` lookup (e.g. `accepted` → emerald, `rejected` → red, `stale_dependency` → orange, `regenerated` → blue). Pure presentation, no state. Used by `NodeRow`, `NodeInspector`, `ShareViewer`, and the dashboard grid. The single place status color is defined.

**`components/atoms/section-label.tsx` (21 lines)** — A small uppercase, letter-spaced "eyebrow" label used to title inspector and dashboard sections. Pure.

**`components/atoms/metric-pill.tsx` (26 lines)** — A compact `label: value` chip with a hairline border. Reusable stat primitive.

**`components/atoms/node-type-icon.tsx` (22 lines)** — Maps a `node_type` to a lucide glyph (`route` → Route, `component` → Component, `organism` → Boxes, `template` → Layers, default → FileCode). Pure icon.

**`components/atoms/logo.tsx` (15 lines)** — The product wordmark: a glowing blue square glyph + "Frontend**Planner**" with the second half in `--primary`. Used in every header and footer.

### Molecules

**`components/molecules/node-row.tsx` (54 lines)** — One selectable row in the plan tree. A client component (it has an `onSelect` handler). Composes exactly two atoms — `NodeTypeIcon` and `StatusBadge` — plus the title, mono route path, and an expanded/not-expanded indicator (filled vs outline circle). Selected state is a primary-tinted border/background. This is the canonical example of a molecule: two atoms + minimal layout, one responsibility (present a node row, report clicks).

### Organisms

**`components/organisms/hero-background.tsx` (158 lines)** — The animated landing backdrop. A single `<canvas>` driving a **particle network** (drifting nodes connected by faint blue lines when within ~130px) layered over three flowing sine-wave rows, plus two CSS **aurora** blobs animated with `aurora-drift`. Performance guards: DPR capped at 2, particle count derived from viewport area and capped at 90, and a full short-circuit to a single static frame under `prefers-reduced-motion`. Cleans up its `requestAnimationFrame` and resize listener on unmount. This is the "Nvidia/Palantir hero field" effect, kept cheap.

**`components/organisms/plan-tree.tsx` (38 lines)** — The left navigator. A `ScrollArea` of `NodeRow` molecules with a `SectionLabel` header and a node count. Stateless: receives `nodes`, `selectedId`, `onSelect`. Reused by both the planner workspace and the public share viewer.

**`components/organisms/node-content-view.tsx` (177 lines)** — A **pure** renderer (no client state, usable in both server and client trees) of an expanded node's `content`. Renders purpose, primary users, required data, then component tables for atoms/molecules/organisms/templates (each row shows name, file path, purpose, and the "why this level" reason), hooks (with input/output), contexts (with what they provide), data shapes (typed fields), mock data (collapsible JSON), libraries (chips with reason tooltips), edge cases, and acceptance criteria. Shared by `NodeInspector` and `ShareViewer` so the spec looks identical whether you're editing or viewing read-only.

**`components/organisms/node-inspector.tsx` (135 lines)** — The detail pane. Client component. Renders the header (title, route, status badge), the action row (Expand/Re-expand, Accept, Reject, Regenerate, Edit, Delete — each with a per-action busy spinner driven by the `busy` prop), and the body: **skeletons** while expanding, `NodeContentView` when expanded, or an empty-state with a big Expand CTA when not. It is "dumb" — all handlers are passed in from `PlannerWorkspace`; it owns no data, only presentation + which action is busy.

**`components/organisms/coherence-panel.tsx` (91 lines)** — Client. A "Run coherence check" button that POSTs to the coherence endpoint and renders the returned warnings as severity-toned cards (error/warning/info) with a message + suggestion. Clicking a warning with a `nodeId` calls `onJump(nodeId)` to select that node in the tree. Owns its own loading/`ran`/`warnings` state.

**`components/organisms/dashboard-plan-grid.tsx` (94 lines)** — Client. The grid of plan cards on the dashboard. Each card links to `/plans/[id]`, shows title, truncated brief, a status badge, route count, and "updated X ago" (`date-fns`), and has a delete button that `DELETE`s the plan and `router.refresh()`es. Empty state prompts the user to generate their first plan. Includes the gradient-hairline hover effect from the polish pass.

**`components/organisms/share-viewer.tsx` (72 lines)** — Client. The read-only public viewer. Its own minimal header (logo + "Read-only shared plan" pill), then `PlanTree` + a read-only detail pane reusing `NodeContentView`. No action buttons, no owner data. Driven entirely by the `{plan, nodes}` passed from the share page.

### `components/ui/` (the primitives)

These are the shadcn components, built on `@base-ui/react`, copied into the repo so we own them. Notable ones and the gotchas they carry:

- **`button.tsx`** — `@base-ui/react/button` + `cva` variants (default/outline/secondary/ghost/destructive/link, sizes incl. icon). **No `asChild`** — base-ui uses a `render` prop (`<Button render={<Link/>}>`). The cva root carries a `group/button` class used for child hover effects.
- **`dropdown-menu.tsx`** — base-ui `Menu`. `DropdownMenuLabel` is `Menu.GroupLabel` and **must be inside a `Menu.Group`** (`DropdownMenuGroup`); using it bare throws Base UI error #31 (this caused a real production crash — see `AI_WORKFLOW.md`). Items support `onClick` and `render`.
- **`select.tsx`** — base-ui `Select` (Root/Trigger/Value/Portal/Positioner/Popup/List/Item). `onValueChange` receives `string | null`.
- **`dialog.tsx`** — base-ui `Dialog`. `DialogContent` bakes in `sm:max-w-sm`; to widen it you must override the `sm:` variant (tailwind-merge keeps both otherwise).
- **`sonner.tsx`** — the `<Toaster>` wrapper (mounted in the root layout).
- Plus `card`, `badge`, `tabs`, `textarea`, `input`, `label`, `scroll-area`, `accordion`, `separator`, `skeleton`, `tooltip`, `alert`, `table`, `sheet` — standard primitives the atoms/organisms compose.

The lesson encoded in these files: this shadcn build is on **@base-ui, not Radix**, so the "Radix way" (`asChild`, bare `GroupLabel`) is wrong here. Several real bugs came from that mismatch and are documented in `AI_WORKFLOW.md`.

---

## 13. File-by-file reference: `features/`

### `features/auth/`

**`actions.ts` (34 lines)** — `"use server"`. `signInWithGoogle()` builds the OAuth URL (`redirectTo = ${APP_URL}/auth/callback?next=/dashboard`, `access_type: offline`, `prompt: consent`) and `redirect()`s to it. `signOut()` calls `supabase.auth.signOut()` and redirects to `/`. Google is the only provider referenced.

**`sign-in-button.tsx` (49 lines)** — A server component rendering `<form action={signInWithGoogle}>` with a Google glyph SVG. The only sign-in entry point in the app. Variant/label props let it appear as the header button and the hero CTA.

**`user-menu.tsx` (58 lines)** — Client. The avatar dropdown. After the Base UI #31 fix it uses a plain `<div>` header (not `DropdownMenuLabel`) and `onClick` items: Dashboard (`router.push`) and Sign out (`router.push("/auth/signout")` — the reliable GET logout route). Receives `email`/`name`/`avatarUrl` from the server layout.

### `features/planner/`

**`types.ts` (5 lines)** — Re-exports `PlanNodeRow`/`PlanRow` as `ClientNode`/`ClientPlan`. The seam that lets client components use the DB row types (pure types, no server imports).

**`brief-composer.tsx` (101 lines)** — Client. The dashboard's input: a `Textarea`, a framework `Select` (nextjs/react/vue), example-brief chips, and a Generate button. On submit it validates length, POSTs to `/api/plans/generate` inside a `useTransition`, toasts success/failure, and `router.push`es to the new plan. Latency is hidden by the pending state on the button ("Generating…").

**`planner-workspace.tsx` (226 lines)** — **The controller.** Client. This is the brain of the planner. It:
- holds `nodes` (seeded from server props), `selectedId`, a `busy` action flag, and dialog open states;
- exposes a generic `call(url, init, action)` helper that sets `busy`, fetches, toasts errors, and clears `busy`;
- implements `expand`, `setStatus` (accept/reject), `regenerate`, `saveEdit`, and `remove`, each updating the local `nodes` array **in place** so a single change never reloads or breaks the rest of the tree;
- on regenerate, reads `staleDependents` from the response and flags matching siblings as `stale_dependency` locally (the visible ripple);
- on delete, removes the node and re-flags dependents, then selects the next node;
- renders the toolbar (back link, plan title/brief, `ExportMenu`), the three-column workspace (`PlanTree` | `NodeInspector` | `CoherencePanel`), and the `RegenerateDialog`/`EditNodeDialog`.

This file is the answer to "Tree UX — drilling, editing, regenerating without the tree falling apart": all mutations are optimistic-then-authoritative against the API, and the tree state is a single source the children render from.

**`edit-node-dialog.tsx` (84 lines)** — Client. A modal to edit a node's title, route path, and purpose. Syncs local form state when opened for a node; calls `onConfirm({title, routePath, purpose})`. The workspace turns that into a `PATCH` with `content: { purpose }`.

**`regenerate-dialog.tsx` (57 lines)** — Client. A modal collecting an optional steering instruction before regeneration, with a pending state on the confirm button. Explains that only this node is regenerated and compatible dependencies are kept.

### `features/export/`

**`export-menu.tsx` (133 lines)** — Client. A dropdown with four actions: download Markdown, download JSON (both open the GET export URLs which stream as attachments), copy the **agent scaffold prompt** (fetches it, copies to clipboard, shows it in a wide scrollable dialog), and create a **read-only share link** (POSTs, copies the URL, shows it in a dialog with a copy button). All async actions toast and guard a `busy` state.

### `features/usage/`

**`usage-meter.tsx` (49 lines)** — A presentational molecule rendering four stat tiles (est. cost, LLM calls, tokens, avg latency) from a `UsageTotals` object. After the polish pass the numerals are `font-mono tabular-nums`, the cost uses the blue gradient, and each tile has a hover glow. The dashboard computes the totals by aggregating `llm_events`.

---

## 14. File-by-file reference: `app/` (routes, pages, API)

### Pages & layouts

**`app/(marketing)/page.tsx` (158 lines)** — The landing page (server component; reads `getAuth()` to show either the user menu or sign-in). Sticky glass header with animated-underline nav, the hero (`HeroBackground` + `grid-bg` + gradient headline + CTAs with staggered `animate-rise`/`fade-up`), a bento feature grid with `card-glow` + sheen-sweep hovers, a four-step "how it works" row, and a footer. The "View a sample plan" CTA points at `/share/sample`.

**`app/(app)/layout.tsx` (33 lines)** — The authenticated shell. Calls `getAuth()` and `redirect("/?auth=required")` if there is no user (the authoritative gate). Renders the glass header (logo → `/dashboard`, `UserMenu`) around `{children}`. Every page under `(app)` inherits it.

**`app/(app)/dashboard/page.tsx` (95 lines)** — Server component, `force-dynamic`. Loads the user's plans, all their plan-node `plan_id`s (to count routes per plan), and all `llm_events` (to aggregate usage) in a `Promise.all` wrapped in try/catch (so a transient query degrades gracefully). Renders `BriefComposer`, the `DashboardPlanGrid`, and the `UsageMeter`. The defensive `num()`/`String()` coercions guard against loosely-typed jsonb/row values.

**`app/(app)/plans/[planId]/page.tsx` (19 lines)** — Server component, `force-dynamic`. Awaits `params`, calls `loadPlanBundle`, `notFound()` if missing, and renders `<PlannerWorkspace plan=… initialNodes=… />`. The thin server→client handoff: the server loads under RLS, the client drives interaction.

**`app/(share)/share/[token]/page.tsx` (39 lines)** — Server, `force-dynamic`. `token === "sample"` → the built-in `SAMPLE_PLAN` (no DB). Otherwise calls the `get_shared_plan` RPC; `notFound()` on null. Renders `<ShareViewer>`. This is the only place the share RPC is consumed.

**`app/(auth)/auth/callback/route.ts` (28 lines)** — Exchanges the OAuth `code` for a session and redirects to `next` (default `/dashboard`), with forwarded-host handling for production.

**`app/(auth)/auth/signout/route.ts` (12 lines)** — `GET` logout: signs out and redirects to `/`. A plain link works even if the dropdown is unreachable — added after the dashboard crash so logout never depends on client state.

**`app/error.tsx` (30 lines)** & **`app/(app)/error.tsx` (35 lines)** — Error boundaries. The root one catches anything below root; the `(app)` one catches page errors **inside** the shell so the header (and profile menu) stay visible. Both offer Try again / Home(or Dashboard) / **Log out** (a plain `<a href="/auth/signout">` so logout works even mid-error). `not-found.tsx` is the themed 404.

### API routes (all wrapped in `handler()`, all `requireUser()` first, `runtime = "nodejs"`)

**`POST /api/plans/generate` (92)** — §5.2. Validates the brief, calls the plan-tree prompt, inserts the plan + route nodes, logs usage. Returns `{ planId }`. On LLM failure logs the failed event and surfaces a `502`.

**`POST /api/nodes/[nodeId]/expand` (115)** — §5.3. Fetches node + plan + sibling titles, returns cached content unless `?force=1`, calls the expand prompt, updates `content`/`expanded`/`status`, snapshots, logs.

**`POST /api/nodes/[nodeId]/regenerate` (116)** — §5.5. Constrained-context regeneration; updates the node, flags stale dependents, snapshots, logs; returns the change report.

**`PATCH/DELETE /api/nodes/[nodeId]` (100)** — §5.4. PATCH validates `patchNodeInputSchema`, merges content, sets status (`edited` on content change), snapshots. DELETE flags dependents `stale_dependency`, then deletes.

**`POST /api/plans/[planId]/coherence-check` (122)** — §5.6. Deterministic checks + optional LLM slop pass; returns merged warnings.

**`GET /api/plans/[planId]/export/json` (22)** & **`/export/markdown` (21)** — Stream `buildJsonExport`/`buildMarkdown` as downloadable attachments.

**`GET /api/plans/[planId]/agent-prompt` (16)** — Returns `{ prompt: buildAgentPrompt(bundle) }`.

**`POST/GET/DELETE /api/plans/[planId]/share` (69)** — Create (random token + optional expiry), list, and deactivate share links.

**`DELETE /api/plans/[planId]` (14)** — Deletes a plan; FK cascades clean up everything beneath it.

---

## 15. The styling, theming & animation system

### Theme

The app is **forced dark** (`html.dark` + `colorScheme: dark` in `app/layout.tsx`). Tailwind v4 drives colors through CSS variables defined in `globals.css`. The shadcn defaults are overridden in a `.dark` block to a black enterprise palette: `--background: oklch(0 0 0)` (true black), near-black card/popover surfaces, and an electric-blue `--primary` (`oklch(0.62 0.19 256)` ≈ `#3B82F6`). Borders are `oklch(1 0 0 / 10%)` (white at 10%). This is the "Palantir data density + Apple structure + monochrome with electric-blue accent" direction.

### Utilities

- **`.glass`** — translucent background + `backdrop-filter: blur(14px) saturate(140%)`. Used by the sticky headers.
- **`.grid-bg`** — a faint technical grid masked with a radial gradient so it fades out. The hero backdrop.
- **`.text-gradient` / `.text-gradient-blue`** — `background-clip: text` gradients for the hero headline and key numerals.
- **`.aurora`** — absolutely-positioned, heavily-blurred radial blobs; animated via `aurora-drift`/`aurora-drift-2`. The glowing color fields behind the hero.
- **`.card-glow`** — `transform`/`box-shadow`/`border-color` transition that lifts a card and adds a blue glow + inset ring on hover.

### Motion

Custom keyframes (`fade-up`, `rise`, `aurora-drift`, `sheen`) provide entrance reveals and ambient motion. The hero particle field is canvas-based (`HeroBackground`). **All** of it respects `prefers-reduced-motion` — the media query disables aurora/reveal animations and the canvas renders a single static frame. The global transition rule is scoped to interactive surfaces and excludes `opacity`/`transform` so it never fights base-ui's own enter/exit animations.

### Hover language

The polish pass established a consistent hover vocabulary: cards lift 3px with a glow, icons scale 110% inside a brightening ring, feature cards run a one-shot sheen sweep, nav links grow an underline, primary CTAs lift + cast a blue shadow. The intent is the "smooth, premium, futuristic" feel of Apple/Nvidia/Palantir marketing sites without a heavy animation dependency.

---

## 16. Error handling & resilience strategy

Defense in depth, layer by layer:

1. **Input validation** — every request body is Zod-parsed; invalid input returns `400` with the first issue message.
2. **LLM output validation** — every model response is Zod-parsed with one repair retry; persistent failure logs an `llm_event` and returns `502`. Bad data never reaches the DB.
3. **Typed errors** — `HttpError` (status) and `LLMError` (status 502 + usage) are caught by the `handler()` wrapper and turned into clean JSON. **No stack traces leak.**
4. **Telemetry never breaks requests** — `logLLMEvent` swallows its own errors.
5. **Graceful data loading** — the dashboard wraps its queries in try/catch and degrades to empty rather than crashing.
6. **Error boundaries** — `app/error.tsx` (root) and `app/(app)/error.tsx` (in-shell) catch render errors and present Try again / Home / **Log out**. The in-shell boundary keeps the header usable during a page error.
7. **Reliable logout** — `/auth/signout` is a plain GET route so sign-out works even if client state is broken.
8. **Optimistic UI with authoritative truth** — the planner updates locally for responsiveness but every change is an API call that runs under RLS; the DB is the source of truth.

A real production incident is encoded here: **Base UI error #31** crashed the dashboard because `UserMenu` used `Menu.GroupLabel` without a `Menu.Group`. The fix (plain `<div>` header) plus the in-shell error boundary plus the GET logout route are all visible in the codebase as the response to that bug — and documented in `AI_WORKFLOW.md`.

---

## 17. Environment variables

| Var | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Publishable/anon key — safe for the browser, RLS-constrained |
| `SUPABASE_SERVICE_ROLE_KEY` | server only (unused by app) | Optional admin-script key; **never** on the request path |
| `SUPABASE_PROJECT_REF` | server | Project ref |
| `LLM_PROVIDER` | server | `groq` (default) |
| `LLM_BASE_URL` | server | OpenAI-compatible base URL |
| `LLM_API_KEY` | server | LLM key (server-only) |
| `LLM_MODEL` | server | e.g. `llama-3.3-70b-versatile` |
| `NEXT_PUBLIC_APP_URL` | client + server | Builds OAuth redirect + share URLs |

`NEXT_PUBLIC_*` vars are inlined into the client bundle at build time; everything else is server-only. `.env.local` (gitignored) holds real values; `.env.example` ships placeholders. **Google OAuth client ID/secret are configured in the Supabase dashboard**, not in app env — Supabase brokers Google for us.

---

## 18. Build, lint, typecheck & deployment pipeline

### Scripts (`package.json`)

- `npm run dev` — Turbopack dev server.
- `npm run build` — Turbopack production build (also runs TypeScript).
- `npm run start` — serve the production build.
- `npm run lint` — ESLint (`next/core-web-vitals` + `next/typescript`).
- `npm run typecheck` — `tsc --noEmit`.

The quality gate before every commit is `lint` + `typecheck` + `build`, all green.

### Deployment

Vercel is connected to the GitHub repo; every push to `main` triggers a production build and deploy. The required env vars are set in the Vercel project. After the first deploy, `NEXT_PUBLIC_APP_URL` is set to the production URL and the app redeployed, and the production callback (`https://<domain>/auth/callback`) is added to Supabase's redirect allowlist. The Supabase→Google callback (`https://<ref>.supabase.co/auth/v1/callback`) must be registered in the Google Cloud OAuth client's authorized redirect URIs.

### Database provisioning

The schema is applied either via the Supabase MCP (`apply_migration`) or by pasting `supabase/COMBINED_SETUP.sql` into the SQL editor. All migrations are idempotent, so re-running is safe. After DDL, the security advisor is checked; the only expected warning (`get_shared_plan` callable by anon) is intentional.

---

## 19. Testing & verification

### Automated gates

`lint`, `typecheck`, and `build` run clean on every change. The Zod layer is effectively a runtime test suite for the LLM boundary: malformed model output fails `safeParse` and is caught.

### Manual / smoke verification performed

- **Landing** renders (200).
- **`/share/sample`** renders the full sample plan with **no DB or login** (200) — proves the read path and the renderer.
- **`/dashboard`** unauthenticated → 307 redirect to `/?auth=required` (proves the proxy guard).
- **`POST /api/plans/generate`** unauthenticated → 401 (proves `requireUser`).
- **End-to-end signed-in flow**: Google sign-in → generate a real plan → expand a node into genuine atomic decomposition → regenerate with an instruction → export the agent prompt → usage meter updates.

### How plan quality is verified (not just "plausible")

The verification standard is the "could I open a PR from this?" test: each expanded page must list components with real file paths, hooks with input/output, a typed data shape, and testable acceptance criteria. The coherence checker is a second gate that flags routes whose required data has no matching model and nodes that read as generic slop.

---

## 20. Consolidated design decisions & trade-offs

| Decision | Why | Trade-off / what was deferred |
|---|---|---|
| **Content-in-jsonb** (page decomposition as one document, not row-per-component) | The unit users act on is the page; one validated document means simpler coherence, one snapshot per change, fewer round-trips, and the model designs one coherent page at a time. | Components aren't individually addressable nodes yet. The `parent_id`/`depth`/`node_type` columns make promoting them later a non-breaking change. |
| **Lazy generation** (routes first, expand on demand) | Cost is proportional to drill-down; each focused call is higher quality than one universe-in-a-shot call. | Slightly more clicks to see everything; mitigated by caching + skeletons. |
| **No client service-role; RLS only** | A service-role key bypasses tenancy and can decrypt the whole DB. RLS enforces tenancy in Postgres so an app bug can't leak data. | A little more ceremony (SECURITY DEFINER RPC) for read-only sharing. |
| **Google OAuth only** | The brief's hard constraint; zero password surface to secure. | No email fallback (intentional). |
| **Deterministic + LLM coherence** | The cheap, reliable checks always run; the LLM pass adds slop detection but never blocks. | LLM pass is best-effort and may miss subtle issues. |
| **OpenAI-compatible provider via plain `fetch`** | Full control over retries/repair/usage; provider is a base-URL + key swap. | We hand-roll the transport instead of using an SDK (acceptable — it's ~180 lines and does exactly what we need). |
| **`proxy.ts` does optimistic redirects only** | Middleware/proxy shouldn't be the authz boundary; RLS + `requireUser` are. | A brief flash of a protected route is possible before the server redirect, which is fine for UX. |
| **shadcn copied in-repo (on @base-ui)** | We own the primitives' markup/styling and aren't locked to a black-box dependency. | We inherit base-ui's API quirks (`render` not `asChild`, `Group` required for `GroupLabel`) — which caused real bugs we then documented. |
| **Forced dark theme** | The enterprise aesthetic is intentional and consistent; no theme toggle to maintain. | No light mode (deferred). |

---

## 21. Consciously deferred scope

Quality over quantity — one stretch done well beats four half-built. Shipped stretch: **versioned plans, Markdown/JSON/agent-prompt exports, read-only sharing, and a usage/cost dashboard.** Deliberately **not** shipped (full rationale in [`docs/DEFERRED_SCOPE.md`](DEFERRED_SCOPE.md)):

- **Undo/redo** — the `plan_versions` data exists; a correct undo stack (with regenerate-conflict handling) is real UX work, deferred rather than half-built.
- **Per-component child nodes** — schema-ready (`parent_id`/`depth`), deferred to avoid multiplying LLM calls and coherence complexity.
- **Side-by-side plan comparison** — orthogonal to the core drill/edit loop.
- **Zip-of-empty-files export** — md/json/agent-prompt already let an engineer or agent start.
- **Full Vue/React idiom variants** — `target_framework` is plumbed end-to-end but per-framework prompt idioms (composables vs hooks, SFCs) and exporters aren't tuned.
- **Rate limiting** on LLM endpoints, **light mode**, and **realtime collaboration**.

---

## 22. Glossary

- **Brief** — the user's plain-English app description; the input to generation.
- **Plan** — one planning session derived from a brief (`plans` row).
- **Node** — a tree element; top-level nodes are routes/pages (`plan_nodes` row).
- **Expand** — the lazy, on-demand LLM call that fills a route node with its atomic decomposition.
- **Atomic level** — atom/molecule/organism/template; every generated component is tagged with one plus a reason.
- **Coherence** — the property that the plan stays internally consistent as nodes change; enforced by dependency edges + the coherence check.
- **Stale dependency** — a node whose dependency changed or was removed; flagged for the user to fix.
- **Global layer** — shared data models, contexts, libraries, and risks stored on `plan_summary`.
- **Operation** — a kind of LLM call: `generate_plan` / `expand_node` / `regenerate_node` / `coherence_check`.
- **Bundle** — a plan plus its nodes and dependencies loaded into memory (`loadPlanBundle`).
- **Proxy** — Next 16's renamed middleware (`proxy.ts`): session relay + optimistic guard.
- **RLS** — Postgres Row Level Security; the tenancy boundary.
- **SECURITY DEFINER** — a Postgres function that runs with its definer's rights; used narrowly for the share RPC.

---

## 23. Interview defense

A reviewer will open random files and ask "explain this" and "the agent suggested X — was it right?" Quick answers to the predictable ones:

**"Why is a page's decomposition in a jsonb column instead of child rows?"**
Because the user acts on the page as a unit — accept/reject/regenerate/version all operate on the whole decomposition at once. One validated document means one snapshot per change, simpler coherence, and the model designs one coherent page per call. The schema (`parent_id`, `depth`, `node_type`) is already shaped so we can promote components to addressable child nodes without a migration when that becomes worth the extra LLM calls.

**"Walk me through what happens when I click Expand."**
`NodeInspector` calls `PlannerWorkspace.expand()`, which sets a busy state (skeletons show), POSTs to `/api/nodes/[id]/expand`. The route `requireUser()`s (RLS-scoped client), loads the node + plan summary + sibling titles, and — if not already expanded — calls `callStructured(nodeContentSchema, expandNodePrompt(...))`. That JSON-mode call is parsed and Zod-validated with one repair retry. On success it updates the node's `content`/`expanded`/`status`, writes a version snapshot, logs an `llm_event`, and returns the node; the workspace replaces it in local state.

**"The agent wrote `<Button asChild><Link/></Button>` — was it right?"**
No. This shadcn build is on @base-ui, which has no `asChild` — it uses a `render` prop (`<Button render={<Link/>}>`). `tsc` caught it (`Property 'asChild' does not exist`). Same family of bug as the `DropdownMenuLabel`-without-a-`Group` crash (Base UI #31). The corrections are in `AI_WORKFLOW.md`.

**"How do you know the plans aren't just plausible slop?"**
The Zod schema rejects any output without file paths, per-component reasons, hook I/O, typed data shapes, and ≥1 acceptance criterion — so structurally-empty output never reaches the user. The prompt bans filler and the `Button-everywhere` pattern. The coherence checker flags routes whose required data has no model and nodes that read generic. And the bar I held myself to is "could an engineer open a PR from this," verified against the committed Kubernetes sample.

**"Why no service-role key on the server?"**
Because it bypasses RLS entirely — one leaked or misused call and tenancy is gone. The app runs every query as the user under RLS; read-only sharing uses a narrow SECURITY DEFINER RPC that returns only active-token data with `owner_id` stripped. There is simply no code path that can read another user's rows.

**"What would you build next?"**
Promote components to child nodes (schema's ready) for per-component regenerate; undo/redo on top of `plan_versions`; and per-framework prompt idioms for the already-plumbed Vue/React targets. All listed, with rationale, in `DEFERRED_SCOPE.md`.

---

---

## Appendix A — Annotated source excerpts of the core files

This appendix reproduces the load-bearing code with line-by-line commentary, so the most important mechanics can be understood without leaving this document.

### A.1 The structured-output engine — `lib/llm/client.ts`

The retry transport:

```ts
export async function callLLM(
  messages: LLMMessage[],
  opts: { temperature?: number; maxTokens?: number; retries?: number } = {},
): Promise<LLMResult> {
  const { temperature = 0.4, maxTokens = 4096, retries = 2 } = opts;
  const started = Date.now();
  let lastErr = "";

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${LLM.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${LLM.apiKey}`,
        },
        body: JSON.stringify({
          model: LLM.model,
          messages,
          temperature,
          max_tokens: maxTokens,
          response_format: { type: "json_object" }, // JSON mode
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        lastErr = `HTTP ${res.status}: ${body.slice(0, 300)}`;
        if (res.status === 429 || res.status >= 500) {  // transient → retry
          await sleep(400 * (attempt + 1));
          continue;
        }
        throw new Error(lastErr);  // 4xx → fail fast
      }

      const json = await res.json();
      const text: string = json.choices?.[0]?.message?.content ?? "";
      const inputTokens: number = json.usage?.prompt_tokens ?? 0;
      const outputTokens: number = json.usage?.completion_tokens ?? 0;

      return {
        text,
        usage: {
          provider: LLM.provider, model: LLM.model,
          inputTokens, outputTokens,
          costEstimate: estimateCost(LLM.model, inputTokens, outputTokens),
          latencyMs: Date.now() - started,
        },
      };
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      if (attempt < retries) await sleep(400 * (attempt + 1));
    }
  }

  // Even on total failure we throw an LLMError carrying usage so callers log cost.
  throw new LLMError(lastErr || "LLM request failed", {
    provider: LLM.provider, model: LLM.model,
    inputTokens: 0, outputTokens: 0, costEstimate: 0,
    latencyMs: Date.now() - started,
  });
}
```

Commentary:
- **JSON mode** is requested explicitly; even so, `extractJson()` (below) defends against the model wrapping JSON in prose.
- The retry condition is precise: only `429` (rate limit) and `5xx` (server) are retried with linear backoff; a `4xx` like `400` is a permanent client error and throws immediately — retrying it would just waste tokens.
- Usage is computed on **every** path, including the throw, because cost accounting must survive failures.

The validate-and-repair wrapper:

```ts
export async function callStructured<T>(
  schema: z.ZodType<T>,
  messages: LLMMessage[],
  opts: { temperature?: number; maxTokens?: number } = {},
): Promise<{ data: T; usage: LLMUsage }> {
  const first = await callLLM(messages, opts);
  const parsed = tryParse(schema, first.text);
  if (parsed.ok) return { data: parsed.data, usage: first.usage };

  // ONE repair attempt: feed the bad output + the exact Zod error back.
  const repair = await callLLM(
    [
      ...messages,
      { role: "assistant", content: first.text },
      {
        role: "user",
        content:
          `Your previous response was not valid for the required schema. ` +
          `Error: ${parsed.error}. ` +
          `Return ONLY corrected, valid JSON matching the schema. No prose, no markdown.`,
      },
    ],
    opts,
  );

  const usage = sumUsage(first.usage, repair.usage);
  const reparsed = tryParse(schema, repair.text);
  if (reparsed.ok) return { data: reparsed.data, usage };

  throw new LLMError(`Schema validation failed after repair: ${reparsed.error}`, usage);
}
```

Commentary:
- The repair message **quotes the specific Zod issue** (`parsed.error` is a joined list of `path: message`), which is far more effective than a generic "that was invalid."
- Exactly **one** repair is attempted — bounded cost. If that fails, the caller gets an `LLMError` (HTTP 502 via `handler()`) and logs the failed event. Bad data is never written.

`extractJson` — the JSON salvager:

```ts
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();          // ```json ... ```
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first)
    return text.slice(first, last + 1);          // first { ... last }
  return text.trim();
}
```

### A.2 The anti-slop contract — `lib/llm/prompts.ts`

```ts
const ANTI_SLOP = `
HARD RULES (a reviewer will reject vague output):
- Be specific to THIS product. No generic boilerplate that would fit any app.
- Never list a component without a concrete reason it exists AND why it sits at its atomic level.
- Atoms = truly indivisible UI (e.g. StatusBadge, MetricValue, IconButton).
  Molecules = small compositions (e.g. SearchBar, FilterChipGroup, KpiCard).
  Organisms = page-defining sections (e.g. WorkloadTable, DeploymentTimeline, BillingUsageChart).
  Templates = layout scaffolds.
- Do NOT put "Button" under every page. Only list a component if the page genuinely needs it.
- Every hook states its input and output. Every context states what it provides.
  Every data model has typed fields. Mock data must be realistic and nested where appropriate.
- Only include a library if it earns its place; give the reason.
- Banned filler words unless immediately followed by a concrete spec:
  "modern", "scalable", "user-friendly", "seamless", "robust", "powerful".
- Output MUST be a single valid JSON object. No markdown, no commentary, no trailing text.`;
```

Commentary: this fragment is shared by the system message of `planTreePrompt`, `expandNodePrompt`, and `regenerateNodePrompt`. The **named examples** per atomic level are what moved the output from slop to specificity (see `AI_WORKFLOW.md` §4 — "saying 'be specific' barely moved it; named examples + a required reason field landed").

### A.3 The planner controller — `features/planner/planner-workspace.tsx`

The generic API caller every action uses:

```ts
async function call<T>(
  url: string,
  init: RequestInit,
  action: InspectorAction,
): Promise<T | null> {
  setBusy(action);                       // drives the per-button spinner
  try {
    const res = await fetch(url, init);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Request failed");
    return data as T;
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Request failed");
    return null;
  } finally {
    setBusy(null);
  }
}
```

The expand action (note the in-place state update):

```ts
async function expand() {
  if (!selected) return;
  const force = selected.expanded ? "?force=1" : "";
  const data = await call<{ node: ClientNode; cached: boolean }>(
    `/api/nodes/${selected.id}/expand${force}`,
    { method: "POST" },
    "expand",
  );
  if (data) {
    replace(data.node);                                    // swap the node in local state
    toast.success(data.cached ? "Loaded cached expansion" : "Page expanded");
  }
}
```

The regenerate action propagating the ripple:

```ts
if (data) {
  replace(data.node);
  setRegenOpen(false);
  if (data.staleDependents.length) {
    setNodes((prev) =>
      prev.map((n) =>
        data.staleDependents.includes(n.title) && n.id !== data.node.id
          ? { ...n, status: "stale_dependency" }
          : n,
      ),
    );
  }
  toast.success(
    `Regenerated${data.changedFields.length ? ` · changed: ${data.changedFields.join(", ")}` : ""}`,
  );
}
```

Commentary: `replace()` maps over `nodes` and swaps the one node, so the tree, inspector, and coherence panel all re-render from one source of truth — **this is why a single change never reloads the page or desyncs the tree.** The `staleDependents` loop is the visible "regenerating one node flags its dependents" behavior the brief asks for.

### A.4 The session proxy — `proxy.ts`

```ts
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(URL, ANON_KEY, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();   // refresh session

  const path = request.nextUrl.pathname;
  const isProtected = path.startsWith("/dashboard") || path.startsWith("/plans");
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("auth", "required");
    return NextResponse.redirect(url);    // optimistic only
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
```

Commentary: the cookie dance is the canonical `@supabase/ssr` pattern adapted to Next 16's `proxy` name. The redirect is **optimistic** — it improves UX but is not the security boundary; RLS + `requireUser()` are.

### A.5 RLS policies — `supabase/migrations/0003_rls.sql`

```sql
alter table public.plans enable row level security;
-- … (all seven tables)

create policy "plans_all_own" on public.plans
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
-- identical shape for plan_nodes, node_dependencies, plan_versions, llm_events, share_links

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
```

Commentary: `using` controls which rows are **visible** to reads/updates/deletes; `with check` controls which rows may be **written**. Setting both to `auth.uid() = owner_id` means a user can neither see nor create a row that isn't theirs. There is no `for ... using (true)` anywhere — no public read, no public write.

### A.6 The share RPC — read-only without table grants

```sql
create or replace function public.get_shared_plan(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_plan_id uuid; v_result jsonb;
begin
  select sl.plan_id into v_plan_id
  from public.share_links sl
  where sl.token = p_token and sl.is_active = true
    and (sl.expires_at is null or sl.expires_at > now());
  if v_plan_id is null then return null; end if;

  select jsonb_build_object(
    'plan', to_jsonb(p) - 'owner_id',
    'nodes', coalesce((select jsonb_agg(to_jsonb(n) - 'owner_id' - 'llm_context' order by n.sort_order)
       from public.plan_nodes n where n.plan_id = v_plan_id), '[]'::jsonb),
    'dependencies', coalesce((select jsonb_agg(to_jsonb(d) - 'owner_id')
       from public.node_dependencies d where d.plan_id = v_plan_id), '[]'::jsonb)
  ) into v_result from public.plans p where p.id = v_plan_id;
  return v_result;
end; $$;

revoke all on function public.get_shared_plan(text) from public;
grant execute on function public.get_shared_plan(text) to anon, authenticated;
```

Commentary: `SECURITY DEFINER` lets this function read `plans`/`plan_nodes` even though `anon` has no direct grant on them — but it only ever returns data for an **active, unexpired token**, and it strips `owner_id` and `llm_context` from the payload. The `- 'owner_id'` jsonb operator removes the key. This is the entire public read surface.

### A.7 The expanded-node schema — `lib/validators/node.ts`

```ts
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
  acceptanceCriteria: z.array(z.string()).min(1),   // ← must have ≥1
});
```

Commentary: the single `.min(1)` on `acceptanceCriteria` is a quiet but important quality gate — a page decomposition with no testable criteria is, by definition, not something an engineer can verify, so it's rejected at the schema boundary and triggers a repair.

---

## Appendix B — API contract reference

Every endpoint. All are under `/api`, all (except none — there are no public API routes) require an authenticated session via `requireUser()`, all return JSON errors shaped `{ "error": string }`, and all are wrapped by `handler()` so unexpected errors become a generic `500` with no stack trace.

### `POST /api/plans/generate`
- **Auth:** required. **Body:** `{ brief: string (8–4000), targetFramework?: "nextjs"|"react"|"vue" }`.
- **Success:** `200 { planId: string }`.
- **Errors:** `400` invalid brief · `401` no session · `502` LLM failed · `503` LLM not configured · `500` DB insert failed.
- **Side effects:** inserts one `plans` row + N `plan_nodes` (one per route, `expanded:false`); inserts one `llm_events` row.

### `POST /api/nodes/[nodeId]/expand`
- **Auth:** required. **Query:** `?force=1` to re-expand. **Body:** none.
- **Success:** `200 { node: PlanNodeRow, cached: boolean }`.
- **Errors:** `404` node/plan not found · `401` · `502` · `500`.
- **Side effects:** updates node `content`/`expanded`/`status`; inserts a `plan_versions` snapshot; inserts `llm_events`.

### `POST /api/nodes/[nodeId]/regenerate`
- **Auth:** required. **Body:** `{ instruction?: string }`.
- **Success:** `200 { node, changedFields[], newDependencies[], staleDependents[], rationale }`.
- **Errors:** `404` · `401` · `502` · `500`.
- **Side effects:** updates node (`status:regenerated`); marks dependency edges `stale`; snapshot; `llm_events`.

### `PATCH /api/nodes/[nodeId]`
- **Auth:** required. **Body:** `{ title?, routePath?, status?, content?: Partial<NodeContent>, rejectionReason? }`.
- **Success:** `200 { node }`.
- **Errors:** `400` invalid patch · `404` · `401` · `500`.
- **Side effects:** updates the node; sets `status:edited` on content/title change; snapshots when content changed.

### `DELETE /api/nodes/[nodeId]`
- **Auth:** required.
- **Success:** `200 { deleted: string, flaggedStale: string[] }`.
- **Side effects:** flags dependent nodes `stale_dependency`, then deletes the node (cascades its versions/edges).

### `POST /api/plans/[planId]/coherence-check`
- **Auth:** required. **Body:** `{ llm?: boolean }` (default true).
- **Success:** `200 { warnings: CoherenceWarning[] }`.
- **Side effects:** may insert one `llm_events` row (the optional LLM pass).

### `GET /api/plans/[planId]/export/json`
- **Auth:** required. **Success:** `200` `application/json` with `Content-Disposition: attachment; filename="plan-<id>.json"`.

### `GET /api/plans/[planId]/export/markdown`
- **Auth:** required. **Success:** `200` `text/markdown` attachment.

### `GET /api/plans/[planId]/agent-prompt`
- **Auth:** required. **Success:** `200 { prompt: string }`.

### `POST /api/plans/[planId]/share`
- **Auth:** required. **Body:** `{ expiresInDays?: number }`.
- **Success:** `200 { token, url, link }`.

### `GET /api/plans/[planId]/share`
- **Auth:** required. **Success:** `200 { links: ShareLinkRow[] }`.

### `DELETE /api/plans/[planId]/share?token=…`
- **Auth:** required. **Success:** `200 { revoked: token }` (sets `is_active=false`).

### `DELETE /api/plans/[planId]`
- **Auth:** required. **Success:** `200 { deleted: planId }` (FK cascade removes nodes/versions/edges/events/links).

### `GET /auth/callback?code=…&next=…`
- **Public** (OAuth). Exchanges code → session, redirects to `next` (default `/dashboard`).

### `GET /auth/signout`
- **Public.** Clears the session, redirects to `/`.

---

## Appendix C — Complete data dictionary

Every column, its type, and notes.

### `profiles`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | = `auth.users.id`; cascade delete |
| `email` | text | from Google |
| `full_name` | text | from `raw_user_meta_data.full_name`/`name` |
| `avatar_url` | text | from Google |
| `created_at` | timestamptz | default now() |
| `updated_at` | timestamptz | touched by trigger |

### `plans`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | gen_random_uuid() |
| `owner_id` | uuid | → auth.users; RLS key |
| `title` | text | from LLM plan summary |
| `brief` | text | original user input |
| `target_framework` | text | nextjs/react/vue |
| `status` | text | draft/generated |
| `plan_summary` | jsonb | global layer (routes, models, contexts, libs, risks) |
| `created_at`/`updated_at` | timestamptz | |

### `plan_nodes`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `plan_id` | uuid | → plans; cascade |
| `owner_id` | uuid | RLS key |
| `parent_id` | uuid | self-ref; null for routes |
| `node_type` | text | 'route' (extensible) |
| `title` | text | |
| `route_path` | text | e.g. `/workloads/[id]` |
| `status` | text | lifecycle (see §6.8) |
| `depth` | int | 0 for routes |
| `sort_order` | int | tree order |
| `content` | jsonb | the validated decomposition |
| `llm_context` | jsonb | reserved (cached context) |
| `expanded` | boolean | false until expanded |
| `created_at`/`updated_at` | timestamptz | |

### `node_dependencies`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `plan_id`/`owner_id` | uuid | |
| `source_node_id` | uuid | the dependent |
| `target_node_id` | uuid | the dependency |
| `dependency_type` | text | 'data' (default) |
| `status` | text | ok/stale/broken |
| `reason` | text | nullable |
| `created_at` | timestamptz | |

### `plan_versions`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `plan_id`/`owner_id` | uuid | |
| `node_id` | uuid | null = plan-level; set null on node delete |
| `version_number` | int | per-plan monotonic |
| `snapshot` | jsonb | the content at that point |
| `reason` | text | e.g. "expand", "regenerate: …" |
| `created_at` | timestamptz | |

### `llm_events`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `plan_id`/`node_id`/`owner_id` | uuid | plan/node nullable |
| `provider`/`model`/`operation` | text | |
| `input_tokens`/`output_tokens` | int | from provider usage |
| `cost_estimate` | numeric(12,6) | from PRICING table |
| `latency_ms` | int | |
| `success` | boolean | false on failed calls |
| `error_message` | text | nullable |
| `created_at` | timestamptz | |

### `share_links`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `plan_id`/`owner_id` | uuid | |
| `token` | text UNIQUE | 64 hex chars |
| `is_active` | boolean | revoke = false |
| `expires_at` | timestamptz | nullable |
| `created_at` | timestamptz | |

### `content` jsonb sub-shape (validated by `nodeContentSchema`)
`{ purpose, primaryUsers[], requiredData[], atoms[], molecules[], organisms[], templates[], hooks[], contexts[], dataModels[], mockData[], assets[], libraries[], edgeCases[], acceptanceCriteria[] }` — where a **component** is `{name, atomicLevel, filePath, purpose, reason, props[], dependsOn[]}`, a **hook** is `{name, filePath, purpose, input, output, state}`, a **context** is `{name, filePath, responsibility, provides[]}`, a **dataModel** is `{name, description, fields:[{name,type,description}]}`, and a **mockRecord** is `{name, sample:any}`.

---

_This document reflects the codebase as built. Companion docs: [README](../README.md) · [PRD](PRD.md) · [SECURITY](SECURITY.md) · [AI_WORKFLOW](AI_WORKFLOW.md) · [SAMPLE_PLAN](SAMPLE_PLAN.md) · [DEFERRED_SCOPE](DEFERRED_SCOPE.md)._




