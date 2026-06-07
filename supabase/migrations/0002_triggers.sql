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
