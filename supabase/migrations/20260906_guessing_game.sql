-- ============================================================
-- WolfTune — Guessing game: per-user track difficulty + stats
-- ============================================================

-- 1. Per-user track difficulty for the weighted picker
--    Starting difficulty: 2, minimum: 1, increases indefinitely
create table if not exists public.user_track_difficulty (
  user_id          uuid not null references public.profiles (id) on delete cascade,
  track_spotify_id text not null,
  difficulty       integer not null default 2 check (difficulty >= 1),
  updated_at       timestamptz not null default now(),
  primary key (user_id, track_spotify_id)
);

-- 2. Per-user track statistics (correct/incorrect guesses)
create table if not exists public.user_track_stats (
  user_id          uuid not null references public.profiles (id) on delete cascade,
  track_spotify_id text not null,
  times_correct    integer not null default 0,
  times_incorrect  integer not null default 0,
  last_guessed_at  timestamptz,
  primary key (user_id, track_spotify_id)
);

-- 3. RLS
alter table public.user_track_difficulty enable row level security;
alter table public.user_track_stats enable row level security;

create policy "Users can manage their own track difficulty"
  on public.user_track_difficulty for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their own track stats"
  on public.user_track_stats for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. Indexes
create index if not exists track_difficulty_user_idx on public.user_track_difficulty (user_id);
create index if not exists track_stats_user_idx on public.user_track_stats (user_id);

-- 5. Atomic increment function for track stats
create or replace function public.increment_track_stats(
  p_user_id uuid,
  p_track_spotify_id text,
  p_correct integer default 0,
  p_incorrect integer default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_track_stats (user_id, track_spotify_id, times_correct, times_incorrect, last_guessed_at)
  values (p_user_id, p_track_spotify_id, p_correct, p_incorrect, now())
  on conflict (user_id, track_spotify_id)
  do update set
    times_correct = public.user_track_stats.times_correct + p_correct,
    times_incorrect = public.user_track_stats.times_incorrect + p_incorrect,
    last_guessed_at = now();
end;
$$;
