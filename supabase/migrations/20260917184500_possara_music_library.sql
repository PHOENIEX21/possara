create table if not exists public.music_tracks (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid null references auth.users(id) on delete set null,
  track_key text not null unique,
  title text not null,
  creator_name text not null,
  category text null,
  audio_url text not null,
  artwork_url text null,
  duration_seconds integer null check (duration_seconds is null or duration_seconds > 0),
  source_type text not null check (source_type in ('artist_upload','public_domain','cc0','possara_original')),
  rights_basis text not null,
  is_approved boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.music_tracks enable row level security;

drop policy if exists "Approved music is readable" on public.music_tracks;
create policy "Approved music is readable"
on public.music_tracks for select
using (is_approved = true and is_active = true);

drop policy if exists "Artists can see own music" on public.music_tracks;
create policy "Artists can see own music"
on public.music_tracks for select
using (owner_user_id = auth.uid());

drop policy if exists "Artists can submit own music" on public.music_tracks;
create policy "Artists can submit own music"
on public.music_tracks for insert
with check (
  owner_user_id = auth.uid()
  and source_type = 'artist_upload'
  and is_approved = false
);

drop policy if exists "Artists can update pending own music" on public.music_tracks;
create policy "Artists can update pending own music"
on public.music_tracks for update
using (owner_user_id = auth.uid() and is_approved = false)
with check (owner_user_id = auth.uid() and source_type = 'artist_upload' and is_approved = false);

drop policy if exists "Admins manage music" on public.music_tracks;
create policy "Admins manage music"
on public.music_tracks for all
using (public.is_admin())
with check (public.is_admin());

alter table public.stories
  add column if not exists music_track_key text null,
  add column if not exists music_creator text null,
  add column if not exists music_clip_start_seconds numeric not null default 0;

create index if not exists music_tracks_active_category_idx
  on public.music_tracks (is_active, is_approved, category, created_at desc);
create index if not exists stories_music_track_key_idx
  on public.stories (music_track_key)
  where music_track_key is not null;
