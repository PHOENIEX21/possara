create table if not exists public.story_interactions(
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check(kind in ('like','reply')),
  body text,
  created_at timestamptz not null default now()
);

alter table public.story_interactions drop constraint if exists story_interactions_story_id_user_id_kind_key;
create unique index if not exists story_interactions_one_like_per_member on public.story_interactions(story_id,user_id) where kind='like';

create index if not exists story_interactions_story_created_idx on public.story_interactions(story_id,created_at);
alter table public.story_interactions enable row level security;
drop policy if exists "Members read story interactions" on public.story_interactions;
create policy "Members read story interactions" on public.story_interactions for select to authenticated using(exists(select 1 from public.stories s where s.id=story_id and (kind='like' or user_id=(select auth.uid()) or s.author_id=(select auth.uid())) and (s.author_id=(select auth.uid()) or s.audience='public' or exists(select 1 from public.follows f where f.following_id=s.author_id and f.follower_id=(select auth.uid())))));
drop policy if exists "Members create own story interactions" on public.story_interactions;
create policy "Members create own story interactions" on public.story_interactions for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.stories s where s.id=story_id and s.expires_at>now() and (s.author_id=(select auth.uid()) or s.audience='public' or exists(select 1 from public.follows f where f.following_id=s.author_id and f.follower_id=(select auth.uid())))));
drop policy if exists "Members delete own story likes" on public.story_interactions;
create policy "Members delete own story likes" on public.story_interactions for delete to authenticated using(user_id=(select auth.uid()) and kind='like');
grant select,insert,delete on public.story_interactions to authenticated;
