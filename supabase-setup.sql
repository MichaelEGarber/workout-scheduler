-- Run this once in Supabase Dashboard → SQL Editor for your private workout project.
-- The table stores a single JSON backup row per signed-in account.
create table if not exists public.workout_sync (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.workout_sync enable row level security;
alter table public.workout_sync force row level security;

revoke all on table public.workout_sync from anon;
revoke all on table public.workout_sync from authenticated;
grant select, insert, update on table public.workout_sync to authenticated;

drop policy if exists "Account can read own workout" on public.workout_sync;
create policy "Account can read own workout"
  on public.workout_sync for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Account can create own workout" on public.workout_sync;
create policy "Account can create own workout"
  on public.workout_sync for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Account can update own workout" on public.workout_sync;
create policy "Account can update own workout"
  on public.workout_sync for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
