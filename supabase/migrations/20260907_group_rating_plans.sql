-- ============================================================
-- WolfTune — Group rating plans
--   Members of a group collaboratively plan what to rate next.
--   Each entry has a scheduled date, an assigned member, and a
--   single target (an album OR a playlist). Any member can edit.
-- ============================================================

create table if not exists public.group_rating_plans (
  id                  uuid primary key default gen_random_uuid(),
  group_id            uuid not null references public.groups (id) on delete cascade,
  album_spotify_id    text references public.music_albums (spotify_id) on delete cascade,
  playlist_spotify_id text references public.music_playlists (spotify_id) on delete cascade,
  assigned_member_id  uuid not null references public.profiles (id) on delete cascade,
  scheduled_date      date not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- Exactly one target type per plan entry (album XOR playlist).
  constraint rating_plan_target_chk check (
    (
      (album_spotify_id is not null)::integer +
      (playlist_spotify_id is not null)::integer
    ) = 1
  )
);

-- updated_at trigger (idempotent — defined in earlier migrations too).
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Idempotent trigger creation (safe to re-run the migration).
drop trigger if exists set_group_rating_plans_updated_at on public.group_rating_plans;

create trigger set_group_rating_plans_updated_at
  before update on public.group_rating_plans
  for each row execute function public.handle_updated_at();

-- Indexes for the browse / statistics queries.
create index if not exists rating_plans_group_idx
  on public.group_rating_plans (group_id);
create index if not exists rating_plans_member_idx
  on public.group_rating_plans (assigned_member_id);
create index if not exists rating_plans_date_idx
  on public.group_rating_plans (scheduled_date);

-- RLS: only group members may read or modify plans. Any member can
-- edit the plan (the requirement is collaborative planning).
alter table public.group_rating_plans enable row level security;

create policy "Group members can view plans"
  on public.group_rating_plans for select
  using (
    group_id in (select gm.group_id from public.group_members gm where gm.user_id = auth.uid())
  );

create policy "Group members can insert plans"
  on public.group_rating_plans for insert
  with check (
    group_id in (select gm.group_id from public.group_members gm where gm.user_id = auth.uid())
  );

create policy "Group members can update plans"
  on public.group_rating_plans for update
  using (
    group_id in (select gm.group_id from public.group_members gm where gm.user_id = auth.uid())
  );

create policy "Group members can delete plans"
  on public.group_rating_plans for delete
  using (
    group_id in (select gm.group_id from public.group_members gm where gm.user_id = auth.uid())
  );
