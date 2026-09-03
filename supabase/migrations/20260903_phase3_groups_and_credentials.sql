-- ============================================================
-- WolfTune — Phase 3: per-user/per-group Spotify credentials + groups
-- ============================================================

-- 1. Spotify credentials on profiles (optional — users can bring their own)
alter table public.profiles
  add column if not exists spotify_client_id text,
  add column if not exists spotify_client_secret text;

-- 2. Groups
create table if not exists public.groups (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  invite_code   text not null unique,
  owner_id      uuid not null references public.profiles (id) on delete cascade,
  spotify_client_id     text,
  spotify_client_secret text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 3. Group memberships
create table if not exists public.group_members (
  group_id  uuid not null references public.groups (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  role      text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- 4. Indexes
create index if not exists groups_owner_idx on public.groups (owner_id);
create index if not exists groups_invite_code_idx on public.groups (invite_code);
create index if not exists group_members_user_idx on public.group_members (user_id);

-- 5. RLS on groups
alter table public.groups enable row level security;

create policy "Groups are viewable by everyone"
  on public.groups for select
  using (true);

create policy "Authenticated users can create groups"
  on public.groups for insert
  with check (auth.uid() = owner_id);

create policy "Group owners can update their groups"
  on public.groups for update
  using (auth.uid() = owner_id);

create policy "Group owners can delete their groups"
  on public.groups for delete
  using (auth.uid() = owner_id);

-- 6. RLS on group_members
alter table public.group_members enable row level security;

create policy "Memberships are viewable by everyone"
  on public.group_members for select
  using (true);

create policy "Users can join a group by inserting their own membership"
  on public.group_members for insert
  with check (auth.uid() = user_id);

create policy "Users can leave their own membership"
  on public.group_members for delete
  using (auth.uid() = user_id);

create policy "Group owners can manage members"
  on public.group_members for update
  using (
    auth.uid() in (
      select owner_id from public.groups where id = group_members.group_id
    )
  );

-- 7. Trigger to auto-add creator as admin on group creation
create or replace function public.handle_new_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.group_members (group_id, user_id, role)
  values (new.id, new.owner_id, 'admin');
  return new;
end;
$$;

create trigger on_group_created
  after insert on public.groups
  for each row execute function public.handle_new_group();
