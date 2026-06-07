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
-- 0002_triggers.sql
-- Profile auto-provisioning + updated_at maintenance.

-- Create a profile row whenever a new auth user is created (Google OAuth sign-up).
-- SECURITY DEFINER + locked search_path so it can write to public.profiles safely.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set email      = excluded.email,
        full_name  = coalesce(excluded.full_name, public.profiles.full_name),
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Generic updated_at touch.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_plans_updated_at on public.plans;
create trigger touch_plans_updated_at
  before update on public.plans
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_plan_nodes_updated_at on public.plan_nodes;
create trigger touch_plan_nodes_updated_at
  before update on public.plan_nodes
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_profiles_updated_at on public.profiles;
create trigger touch_profiles_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();
-- 0003_rls.sql
-- Row Level Security. Every table is owner-scoped. The client uses the anon key
-- with the signed-in user's JWT; auth.uid() is the user id. There is no policy
-- that permits cross-user reads or public writes.

alter table public.profiles          enable row level security;
alter table public.plans             enable row level security;
alter table public.plan_nodes        enable row level security;
alter table public.node_dependencies enable row level security;
alter table public.plan_versions     enable row level security;
alter table public.llm_events        enable row level security;
alter table public.share_links       enable row level security;

-- profiles: a user can read/update only their own row. Inserts happen via the
-- SECURITY DEFINER trigger, so no client INSERT policy is needed.
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Helper macro pattern: owner_id = auth.uid() for all CRUD on owned tables.
create policy "plans_all_own" on public.plans
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "plan_nodes_all_own" on public.plan_nodes
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "node_dependencies_all_own" on public.node_dependencies
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "plan_versions_all_own" on public.plan_versions
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "llm_events_all_own" on public.llm_events
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "share_links_all_own" on public.share_links
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- ---------------------------------------------------------------------------
-- Read-only public sharing.
-- Anon users have NO direct select on plans/plan_nodes. Instead they call this
-- SECURITY DEFINER function with a token; it returns the plan ONLY if the token
-- is active and unexpired. No write path, no owner data beyond the plan tree.
-- ---------------------------------------------------------------------------
create or replace function public.get_shared_plan(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan_id uuid;
  v_result  jsonb;
begin
  select sl.plan_id into v_plan_id
  from public.share_links sl
  where sl.token = p_token
    and sl.is_active = true
    and (sl.expires_at is null or sl.expires_at > now());

  if v_plan_id is null then
    return null;
  end if;

  select jsonb_build_object(
    'plan', to_jsonb(p) - 'owner_id',
    'nodes', coalesce(
      (select jsonb_agg(to_jsonb(n) - 'owner_id' - 'llm_context' order by n.sort_order)
       from public.plan_nodes n where n.plan_id = v_plan_id), '[]'::jsonb),
    'dependencies', coalesce(
      (select jsonb_agg(to_jsonb(d) - 'owner_id')
       from public.node_dependencies d where d.plan_id = v_plan_id), '[]'::jsonb)
  )
  into v_result
  from public.plans p
  where p.id = v_plan_id;

  return v_result;
end;
$$;

revoke all on function public.get_shared_plan(text) from public;
grant execute on function public.get_shared_plan(text) to anon, authenticated;
