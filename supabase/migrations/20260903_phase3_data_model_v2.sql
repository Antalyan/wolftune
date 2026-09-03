-- ============================================================
-- WolfTune — Phase 3: data model v2
--   * catalog snapshot tables (Spotify metadata cached locally)
--   * per-track ratings + subjective album/playlist ratings
--   * averages are computed from track_ratings only
-- Run AFTER 20260903_initial_schema.sql
-- ============================================================

-- updated_at helper (idempotent — Phase 2 defines it too)
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
-- 1. CATALOG SNAPSHOTS
-- ------------------------------------------------------------
create table if not exists public.music_albums (
  spotify_id    text primary key,
  name          text not null,
  artist_name   text not null,
  cover_url     text,
  release_date  text,
  total_tracks  integer not null default 0,
  created_at    timestamptz not null default now()
);

create table if not exists public.music_playlists (
  spotify_id    text primary key,
  name          text not null,
  owner_name    text,
  cover_url     text,
  total_tracks  integer not null default 0,
  created_at    timestamptz not null default now()
);

create table if not exists public.music_tracks (
  spotify_id        text primary key,
  name              text not null,
  artist_name       text not null,
  album_spotify_id  text references public.music_albums (spotify_id) on delete set null,
  album_name        text,
  cover_url         text,
  duration_ms       integer,
  track_number      integer,
  created_at        timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. RATINGS V2
--    * track_ratings  — one per (user, track): the per-song score
--    * album_ratings  — subjective overall album score (+ optional note)
--    * playlist_ratings — subjective overall playlist score (+ optional note)
--    Displayed album/playlist averages are computed from track_ratings only,
--    i.e. the subjective score is EXCLUDED from the average, per spec.
-- ------------------------------------------------------------
create table if not exists public.track_ratings (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  track_spotify_id text not null references public.music_tracks (spotify_id) on delete cascade,
  score            numeric(3, 1) not null check (score >= 1 and score <= 10),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, track_spotify_id)
);

create table if not exists public.album_ratings (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  album_spotify_id text not null references public.music_albums (spotify_id) on delete cascade,
  subjective_score numeric(3, 1) not null check (subjective_score >= 1 and subjective_score <= 10),
  note             text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, album_spotify_id)
);

create table if not exists public.playlist_ratings (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles (id) on delete cascade,
  playlist_spotify_id text not null references public.music_playlists (spotify_id) on delete cascade,
  subjective_score   numeric(3, 1) not null check (subjective_score >= 1 and subjective_score <= 10),
  note               text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (user_id, playlist_spotify_id)
);

create trigger set_track_ratings_updated_at
  before update on public.track_ratings
  for each row execute function public.handle_updated_at();

create trigger set_album_ratings_updated_at
  before update on public.album_ratings
  for each row execute function public.handle_updated_at();

create trigger set_playlist_ratings_updated_at
  before update on public.playlist_ratings
  for each row execute function public.handle_updated_at();

-- ------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table public.music_albums    enable row level security;
alter table public.music_playlists enable row level security;
alter table public.music_tracks    enable row level security;
alter table public.track_ratings   enable row level security;
alter table public.album_ratings   enable row level security;
alter table public.playlist_ratings enable row level security;

-- Catalog snapshots: public metadata, readable by everyone,
-- upsertable by signed-in users (writes go through server actions).
create policy "Catalog albums are viewable by everyone"
  on public.music_albums for select using (true);
create policy "Authenticated users can add catalog albums"
  on public.music_albums for insert to authenticated with check (true);
create policy "Authenticated users can update catalog albums"
  on public.music_albums for update to authenticated using (true);

create policy "Catalog playlists are viewable by everyone"
  on public.music_playlists for select using (true);
create policy "Authenticated users can add catalog playlists"
  on public.music_playlists for insert to authenticated with check (true);
create policy "Authenticated users can update catalog playlists"
  on public.music_playlists for update to authenticated using (true);

create policy "Catalog tracks are viewable by everyone"
  on public.music_tracks for select using (true);
create policy "Authenticated users can add catalog tracks"
  on public.music_tracks for insert to authenticated with check (true);
create policy "Authenticated users can update catalog tracks"
  on public.music_tracks for update to authenticated using (true);

-- Ratings: readable by everyone (needed for group views),
-- writable only by the owner.
create policy "Track ratings are viewable by everyone"
  on public.track_ratings for select using (true);
create policy "Users can insert their own track ratings"
  on public.track_ratings for insert with check (auth.uid() = user_id);
create policy "Users can update their own track ratings"
  on public.track_ratings for update using (auth.uid() = user_id);
create policy "Users can delete their own track ratings"
  on public.track_ratings for delete using (auth.uid() = user_id);

create policy "Album ratings are viewable by everyone"
  on public.album_ratings for select using (true);
create policy "Users can insert their own album ratings"
  on public.album_ratings for insert with check (auth.uid() = user_id);
create policy "Users can update their own album ratings"
  on public.album_ratings for update using (auth.uid() = user_id);
create policy "Users can delete their own album ratings"
  on public.album_ratings for delete using (auth.uid() = user_id);

create policy "Playlist ratings are viewable by everyone"
  on public.playlist_ratings for select using (true);
create policy "Users can insert their own playlist ratings"
  on public.playlist_ratings for insert with check (auth.uid() = user_id);
create policy "Users can update their own playlist ratings"
  on public.playlist_ratings for update using (auth.uid() = user_id);
create policy "Users can delete their own playlist ratings"
  on public.playlist_ratings for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 4. INDEXES for the feed/statistics queries
-- ------------------------------------------------------------
create index if not exists track_ratings_track_idx
  on public.track_ratings (track_spotify_id);
create index if not exists track_ratings_user_idx
  on public.track_ratings (user_id);
create index if not exists track_ratings_updated_idx
  on public.track_ratings (updated_at desc);

create index if not exists album_ratings_album_idx
  on public.album_ratings (album_spotify_id);
create index if not exists album_ratings_user_idx
  on public.album_ratings (user_id);

create index if not exists playlist_ratings_playlist_idx
  on public.playlist_ratings (playlist_spotify_id);
create index if not exists playlist_ratings_user_idx
  on public.playlist_ratings (user_id);

create index if not exists music_tracks_album_idx
  on public.music_tracks (album_spotify_id);

-- ------------------------------------------------------------
-- 5. Retire the Phase-2 ratings prototype (never used in production)
-- ------------------------------------------------------------
drop table if exists public.ratings;
