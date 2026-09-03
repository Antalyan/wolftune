-- ============================================================
-- WolfTune — Initial schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- ------------------------------------------------------------
-- PROFILES (one row per authenticated user)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  username   text not null unique,
  avatar_url text,
  bio        text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create a profile when a user signs up (email, OAuth, or any provider)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'user_name', split_part(new.email, '@', 1), 'wolf'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at fresh
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- RATINGS (one rating per (user, track); upsert-able)
-- ------------------------------------------------------------
create table if not exists public.ratings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  track_id    text not null,
  track_name  text not null,
  artist_name text not null,
  album_cover text,
  score       numeric(3, 1) not null check (score >= 1 and score <= 10),
  review_text text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, track_id)
);

create trigger set_ratings_updated_at
  before update on public.ratings
  for each row execute function public.handle_updated_at();

-- ------------------------------------------------------------
-- GAME SCORES (one row per played game)
-- ------------------------------------------------------------
create table if not exists public.game_scores (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  score      integer not null default 0,
  streak     integer not null default 0,
  game_mode  text not null default 'snippet-guess',
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table public.profiles   enable row level security;
alter table public.ratings    enable row level security;
alter table public.game_scores enable row level security;

-- Profiles: readable by everyone; writable only by the owner
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Ratings: readable by everyone; writable only by the owner
create policy "Ratings are viewable by everyone"
  on public.ratings for select
  using (true);

create policy "Users can insert their own ratings"
  on public.ratings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own ratings"
  on public.ratings for update
  using (auth.uid() = user_id);

create policy "Users can delete their own ratings"
  on public.ratings for delete
  using (auth.uid() = user_id);

-- Game scores: readable by everyone; writable only by the owner
create policy "Game scores are viewable by everyone"
  on public.game_scores for select
  using (true);

create policy "Users can insert their own game scores"
  on public.game_scores for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own game scores"
  on public.game_scores for update
  using (auth.uid() = user_id);

create policy "Users can delete their own game scores"
  on public.game_scores for delete
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------
create index if not exists profiles_username_idx on public.profiles (username);
create index if not exists ratings_user_id_idx   on public.ratings (user_id);
create index if not exists ratings_track_id_idx  on public.ratings (track_id);
create index if not exists game_scores_user_id_idx on public.game_scores (user_id);