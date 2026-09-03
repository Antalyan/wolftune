-- ============================================================
-- WolfTune — Initial schema (user profiles)
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- Rating/game tables now live in 20260903_phase3_data_model_v2.sql
-- ============================================================

-- 1. PROFILES (one row per authenticated user)
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  username   text not null unique,
  avatar_url text,
  bio        text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. AUTO-CREATE A PROFILE WHEN A USER SIGNS UP (email, OAuth, or any provider)
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

-- 3. ROW LEVEL SECURITY
alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 4. INDEX
create index if not exists profiles_username_idx on public.profiles (username);
