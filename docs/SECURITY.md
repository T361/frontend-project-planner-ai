# Security

## Threat model
Multi-tenant SaaS: the main risk is one user reading or writing another user's plans, and leaking secrets to the browser. Both are addressed structurally.

## Authentication
- **Google OAuth only.** No email/password UI or endpoints. `proxy.ts` keeps the session fresh and optimistically guards `/dashboard` + `/plans`; real checks are server-side.
- Every API route calls `requireUser()` → 401 without a valid session.

## RLS — every table, owner-scoped
`alter table … enable row level security` on all seven tables.

| Table | Policy |
|---|---|
| `profiles` | `select/update` where `id = auth.uid()` (insert via SECURITY DEFINER trigger only) |
| `plans`, `plan_nodes`, `node_dependencies`, `plan_versions`, `llm_events`, `share_links` | `FOR ALL using/with check (owner_id = auth.uid())` |

The app uses **only** the publishable/anon key plus the user's JWT (in cookies). So `auth.uid()` is the real user and policies can't be sidestepped from the client. **There is no policy that permits cross-user reads or public writes.**

## No service-role on the request path
The app never uses `SUPABASE_SERVICE_ROLE_KEY` to serve requests. `lib/supabase/server.ts` builds the client with the anon key + user cookies. The service-role var exists only for optional offline admin scripts and is documented as such.

## Read-only sharing without opening the tables
Anon users have **no** select grant on `plans`/`plan_nodes`. Sharing works via:
```sql
create function public.get_shared_plan(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$ … $$;
grant execute on function public.get_shared_plan(text) to anon, authenticated;
```
It returns a plan **only** if the token row is `is_active` and not expired, and strips `owner_id` (and `llm_context`) from the payload. No write path. Tokens are 64 hex chars from `crypto.randomUUID()×2`.

## Secrets
- LLM key + base URL read in `lib/llm/config.ts`, guarded by `import "server-only"` so they can never enter a client bundle.
- All LLM calls run in route handlers.
- `.env.local` gitignored; `.env.example` has placeholders only.
- The repo history was scanned for secrets before every push.

## Input handling & error hygiene
- All request bodies validated with Zod before touching the DB.
- All LLM output validated with Zod before persistence.
- The `handler()` wrapper converts thrown errors into clean JSON (`401/400/502/500`) — **no stack traces leak** to clients.
- `SECURITY DEFINER` functions pin `search_path = ''` to prevent search-path hijacking.

## Known follow-ups
- Per-IP/user rate limiting on LLM endpoints (currently relies on Supabase + provider limits) — see DEFERRED_SCOPE.
- Optional share-link expiry UI (the column + RPC check exist).
