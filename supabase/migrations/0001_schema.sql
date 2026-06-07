-- 0001_schema.sql
-- Core schema for the AI-Augmented Frontend Project Planner.
-- All app tables live in `public` and are owner-scoped via owner_id = auth.uid() (see 0003_rls.sql).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, populated by the on_auth_user_created trigger.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- plans: a single planning session generated from a natural-language brief.
-- plan_summary holds the global layer (data models, contexts, libs, risks).
-- ---------------------------------------------------------------------------
create table if not exists public.plans (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references auth.users (id) on delete cascade,
  title            text not null,
  brief            text not null,
  target_framework text not null default 'nextjs',
  status           text not null default 'draft',
  plan_summary     jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- plan_nodes: the drillable tree. Top level = route/page nodes. When a node is
-- expanded, its atoms/molecules/organisms/hooks/contexts/data/mock/etc live in
-- `content` (jsonb) rather than as separate rows — lazy generation per node.
-- ---------------------------------------------------------------------------
create table if not exists public.plan_nodes (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references public.plans (id) on delete cascade,
  owner_id    uuid not null references auth.users (id) on delete cascade,
  parent_id   uuid references public.plan_nodes (id) on delete cascade,
  node_type   text not null default 'route',
  title       text not null,
  route_path  text,
  status      text not null default 'draft',
  depth       int  not null default 0,
  sort_order  int  not null default 0,
  content     jsonb not null default '{}'::jsonb,
  llm_context jsonb not null default '{}'::jsonb,
  expanded    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists plan_nodes_plan_id_idx   on public.plan_nodes (plan_id);
create index if not exists plan_nodes_parent_id_idx on public.plan_nodes (parent_id);
create index if not exists plan_nodes_owner_id_idx  on public.plan_nodes (owner_id);

-- ---------------------------------------------------------------------------
-- node_dependencies: explicit edges used for coherence checks (e.g. a route
-- depends on a global data model; flagged stale when the target changes/removes).
-- ---------------------------------------------------------------------------
create table if not exists public.node_dependencies (
  id              uuid primary key default gen_random_uuid(),
  plan_id         uuid not null references public.plans (id) on delete cascade,
  owner_id        uuid not null references auth.users (id) on delete cascade,
  source_node_id  uuid not null references public.plan_nodes (id) on delete cascade,
  target_node_id  uuid not null references public.plan_nodes (id) on delete cascade,
  dependency_type text not null default 'data',
  status          text not null default 'ok',
  reason          text,
  created_at      timestamptz not null default now()
);

create index if not exists node_dependencies_plan_id_idx on public.node_dependencies (plan_id);

-- ---------------------------------------------------------------------------
-- plan_versions: immutable snapshots created on every edit/regenerate, so the
-- tree is recoverable and changes are auditable. node_id null => plan-level.
-- ---------------------------------------------------------------------------
create table if not exists public.plan_versions (
  id             uuid primary key default gen_random_uuid(),
  plan_id        uuid not null references public.plans (id) on delete cascade,
  owner_id       uuid not null references auth.users (id) on delete cascade,
  node_id        uuid references public.plan_nodes (id) on delete set null,
  version_number int not null,
  snapshot       jsonb not null,
  reason         text,
  created_at     timestamptz not null default now()
);

create index if not exists plan_versions_plan_id_idx on public.plan_versions (plan_id);

-- ---------------------------------------------------------------------------
-- llm_events: one row per model call for cost/latency/usage dashboards.
-- ---------------------------------------------------------------------------
create table if not exists public.llm_events (
  id            uuid primary key default gen_random_uuid(),
  plan_id       uuid references public.plans (id) on delete cascade,
  node_id       uuid references public.plan_nodes (id) on delete set null,
  owner_id      uuid not null references auth.users (id) on delete cascade,
  provider      text not null,
  model         text not null,
  operation     text not null,
  input_tokens  int not null default 0,
  output_tokens int not null default 0,
  cost_estimate numeric(12,6) not null default 0,
  latency_ms    int not null default 0,
  success       boolean not null default true,
  error_message text,
  created_at    timestamptz not null default now()
);

create index if not exists llm_events_plan_id_idx  on public.llm_events (plan_id);
create index if not exists llm_events_owner_id_idx on public.llm_events (owner_id);

-- ---------------------------------------------------------------------------
-- share_links: read-only public tokens. Reads go through a SECURITY DEFINER
-- RPC (0003) so anon can fetch a shared plan WITHOUT broad table grants.
-- ---------------------------------------------------------------------------
create table if not exists public.share_links (
  id         uuid primary key default gen_random_uuid(),
  plan_id    uuid not null references public.plans (id) on delete cascade,
  owner_id   uuid not null references auth.users (id) on delete cascade,
  token      text not null unique,
  is_active  boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists share_links_token_idx on public.share_links (token);
