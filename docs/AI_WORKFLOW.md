# AI Workflow

How this tool was built with AI agents, what was rejected, and how the planner's own prompts were tuned.

## 1. Scoping & decomposition before handing work to agents

I refused to "build the whole thing in one prompt." I sliced the work into layers that could each be verified independently before the next depended on it:

1. **Contracts first** — Zod schemas (`lib/validators/*`) define the plan tree, node content, regenerate output, and coherence report. Everything else (DB shape, prompts, UI) is derived from these, so the data contract is one source of truth.
2. **Server boundary** — Supabase clients, `proxy.ts`, `requireUser()`, RLS migrations. Auth and tenancy had to be correct before any data flowed.
3. **LLM orchestration** — a provider-agnostic `callStructured()` (retry + one JSON-repair) + a prompt library, kept entirely server-side.
4. **API routes** — thin handlers that compose validator + prompt + DB + usage logging.
5. **Atomic UI** — atoms → molecules → organisms → feature controllers, last, against a working API.

Each layer ended with `lint + typecheck + build` before moving on. This is also why generation is **lazy**: scoping the *product's* work this way made it obvious the tool should generate the route tree first and decompose pages on demand.

## 2. Coding-agent prompts (verbatim) + resulting output

### Prompt A — LLM orchestration core
> "Write a server-only LLM client for an OpenAI-compatible endpoint (Groq). Export `callLLM(messages, opts)` returning `{text, usage}` with retry on 429/5xx and backoff, JSON mode on. Then `callStructured(schema, messages)` that JSON-parses, validates with a Zod schema, and on failure makes exactly ONE repair call feeding the bad output + the zod error back to the model. Sum usage across both calls. Throw a typed `LLMError` carrying usage so the caller can still log cost on failure."

**Output:** `lib/llm/client.ts` essentially as specified. I kept the structure; I tightened `extractJson()` to handle fenced code blocks and to slice from the first `{` to the last `}` (the model occasionally wrapped JSON in prose despite json-mode).

### Prompt B — Anti-slop expansion prompt
> "Write the system+user prompt for expanding ONE route into atoms/molecules/organisms/templates, hooks, contexts, data models, mock data, assets, libraries, edge cases, acceptance criteria. It must FORBID generic output: every component needs a concrete reason and an atomic-level justification; ban 'Button under every page'; ban filler words ('modern', 'scalable') unless followed by a concrete spec; require a single JSON object."

**Output:** the `ANTI_SLOP` block + `expandNodePrompt` in `lib/llm/prompts.ts`. See §4 for how I iterated on it.

### Prompt C — Drillable tree workspace
> "Build a client `PlannerWorkspace` that owns the tree state and wires expand/accept/reject/regenerate/edit/delete against the API, updating nodes in place so a single change never reloads or breaks the rest of the tree. Left: route navigator. Center: node inspector with per-node actions and skeletons while expanding. Right: coherence panel. Use shadcn components; keep presentational pieces in components/organisms."

**Output:** `features/planner/planner-workspace.tsx` + the organisms. I split the inspector and tree into separate presentational organisms (the agent had inlined everything), and moved the dialogs to `features/planner/*` so the controller stayed readable.

## 3. Where I rejected / corrected AI output

1. **`asChild` everywhere (wrong component library).** The agent wrote shadcn the "Radix way" — `<Button asChild><Link/></Button>` and `<DropdownMenuItem asChild>`. The build's `tsc` caught it: *"Property 'asChild' does not exist."* This shadcn is built on **@base-ui**, which uses a `render` prop, not `asChild`. I read the generated `button.tsx`/`dropdown-menu.tsx`, confirmed `render`, and rewrote every occurrence (`render={<Link/>}`). Lesson: verify the actual installed primitive, don't trust the framework's "usual" API.

2. **Service-role to "make it work."** An early instinct (and a tempting shortcut) was to use the Supabase service-role key on the server to read shared plans and dodge RLS friction. I rejected it: it bypasses tenancy and is exactly what the brief warns against. Replaced with a `SECURITY DEFINER` `get_shared_plan(token)` RPC that returns only active-token data with `owner_id` stripped — anon never touches the tables directly.

3. **Legacy anon JWT key.** I initially wired `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the JWT-style anon key. Probing the REST endpoint returned `UNAUTHORIZED_INVALID_API_KEY_TYPE` — this project uses the **new publishable/secret key system**. Switched the public client to the `sb_publishable_…` key. Caught by actually hitting the API instead of assuming.

4. **Coherence param typed `any`.** `tsc` flagged an implicit-any on the global-models map (Supabase returns loosely-typed JSON). Rather than `// @ts-ignore`, I annotated `summaryModels: { name: string }[]` so the slop check stays type-safe.

## 4. Tuning the planner's own prompts

- **First attempt** asked for "components, hooks, contexts, data." Output was real slop: `Button`, `Card`, `Container` under every page, "modern UI", no file paths. Useless.
- **What failed:** simply saying "be specific" barely moved it. Adding more adjectives made it worse.
- **What landed:** (a) a hard `ANTI_SLOP` contract with **named examples** of each atomic level ("organisms = WorkloadTable, DeploymentTimeline"), (b) requiring a `reason` field per component *and* a separate why-this-atomic-level justification, (c) explicitly banning "Button under every page" and filler words, (d) forcing **file paths** and **acceptance criteria** so the output has to commit to specifics, (e) splitting **generate** (routes + global layer only) from **expand** (one page) so the model isn't diluted across the whole app at once.
- **Regenerate** was tuned to return an explicit `changedFields` / `staleDependents` report so the UI can flag the rest of the tree instead of silently swapping content.

## 5. How I verified plans are useful, not just plausible

- **Schema gate:** if the model can't produce typed fields, file paths, and acceptance criteria, `safeParse` fails and it never reaches the user.
- **The "could I open a PR from this?" test:** I generated the K8s console sample and checked each expanded page lists components with real file paths, hooks with input/output, a data shape, and testable acceptance criteria — i.e. an engineer could start. That sample is committed (`docs/SAMPLE_PLAN.md`, `/share/sample`).
- **Coherence pass:** deterministic checks catch routes whose required data has no matching model; the LLM pass flags remaining generic nodes.

## 6. What I deliberately did not ship

Undo/redo, side-by-side plan comparison, zip-of-empty-files export, per-component child nodes, and full Vue/React idiom variants. Rationale in [DEFERRED_SCOPE.md](DEFERRED_SCOPE.md) — one stretch (versioning + exports + sharing + usage dashboard) done well over four half-built ones.
