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
