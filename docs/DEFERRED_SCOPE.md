# Consciously deferred scope

Quality over quantity. What I chose **not** to ship, and why.

| Deferred | Why | Cost to add later |
|---|---|---|
| **Undo / redo** on the tree | `plan_versions` already snapshots every change, so the data exists. A correct undo stack (and conflict handling with regenerate) is real UX work I'd rather do well than half-build. | Low–medium — read snapshots back into nodes. |
| **Side-by-side plan comparison** | Useful but orthogonal to the core "drill + edit" loop; would split focus. | Medium — diff two `buildJsonExport` outputs. |
| **Zip-of-empty-files export** | Markdown + JSON + agent-prompt already let an engineer/agent start. A zip is a nice-to-have, not a differentiator. | Low — add `jszip`, walk file paths in `content`. |
| **Per-component child nodes** | Today a page's atoms/molecules/organisms live in the page node's validated `content`. Promoting each component to an addressable `plan_nodes` row enables per-component accept/regenerate but multiplies LLM calls and coherence complexity. The schema (`parent_id`, `node_type`, `depth`) already supports it. | Medium — expand writes child rows instead of inline content. |
| **Full Vue / plain-React idiom variants** | The brief targets Next.js at minimum; `target_framework` is plumbed end-to-end (input, prompt, export) and accepts `react`/`vue`, but I did not tune separate prompt idioms (composables vs hooks, SFCs) or per-framework exporters. | Medium — framework-specific prompt + export branches. |
| **Rate limiting on LLM routes** | Relies on Supabase auth + Groq provider limits for now. Production needs per-user/IP throttling. | Low — token bucket in `proxy.ts` or an edge KV. |
| **Realtime / collaboration** | Single-user editing is the assessment's scope; multiplayer is a separate product. | High. |

Everything above is intentional. The shipped stretch set — **versioned plans + Markdown/JSON/agent-prompt exports + read-only sharing + a usage/cost dashboard** — was prioritized because it makes the core output *leave the tool and start a project*, which is the point.
