/**
 * Persistent storage for Spotify OAuth refresh tokens per user.
 * Each user authorizes their OWN Spotify application (registered in
 * their Spotify Developer account). We store the refresh token
 * server-side so it can be used for playlist access across sessions.
 */

create table if not exists spotify_tokens (
  user_id        uuid primary key references profiles (id) on delete cascade,
  refresh_token  text not null,
  scope          text,
  expires_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Ensure columns exist for tables created by earlier versions of the schema
alter table public.spotify_tokens
  add column if not exists refresh_token text not null,
  add column if not exists scope text,
  add column if not exists expires_at timestamptz;

-- Enable RLS immediately so Supabase's security advisor is satisfied
alter table public.spotify_tokens enable row level security;

create policy "Users can manage their own Spotify tokens"
  on public.spotify_tokens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Allow the app to check for existence (RLS handles filtering)
create unique index if not exists spotify_tokens_user_id_key on spotify_tokens (user_id);
