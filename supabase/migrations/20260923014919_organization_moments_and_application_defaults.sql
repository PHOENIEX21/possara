alter table public.organizations add column if not exists application_defaults jsonb not null default '{"labels":["CV / résumé"],"accept":["application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","image/jpeg","image/png","image/webp"],"required":true}'::jsonb;
alter table public.stories add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
create index if not exists stories_organization_expiry_idx on public.stories(organization_id,expires_at) where organization_id is not null;

drop policy if exists "Users can post their own stories" on public.stories;
create policy "Users can post their own stories" on public.stories for insert to authenticated
with check(author_id=(select auth.uid()) and not public.is_banned() and (organization_id is null or public.is_organization_manager(organization_id)));

drop policy if exists "Active moments follow audience" on public.stories;
drop policy if exists "Public active moments" on public.stories;
create policy "Public active moments" on public.stories for select to anon using(expires_at>now() and audience='public');
create policy "Active moments follow audience" on public.stories for select to authenticated
using(expires_at>now() and (
  audience='public'
  or (organization_id is null and (author_id=(select auth.uid()) or exists(select 1 from public.follows f where f.follower_id=(select auth.uid()) and f.following_id=author_id)))
  or (organization_id is not null and (public.is_organization_manager(organization_id) or exists(select 1 from public.organization_follows f where f.user_id=(select auth.uid()) and f.organization_id=stories.organization_id)))
));

drop policy if exists "Owners or moderators delete moments" on public.stories;
create policy "Owners or moderators delete moments" on public.stories for delete to authenticated
using((organization_id is null and author_id=(select auth.uid())) or (organization_id is not null and public.is_organization_manager(organization_id)) or public.is_admin_or_mod());

drop policy if exists "Authorized viewers read moment files" on storage.objects;
create policy "Authorized viewers read moment files" on storage.objects for select to anon,authenticated
using(bucket_id='moments' and exists(select 1 from public.stories s where s.storage_path=objects.name and s.expires_at>now()));
drop policy if exists "Authorized viewers read moment music" on storage.objects;
create policy "Authorized viewers read moment music" on storage.objects for select to anon,authenticated
using(bucket_id='moment-music' and exists(select 1 from public.stories s where s.music_path=objects.name and s.expires_at>now()));

drop policy if exists "Members read story interactions" on public.story_interactions;
create policy "Members read story interactions" on public.story_interactions for select to authenticated
using(exists(select 1 from public.stories s where s.id=story_id and (kind='like' or user_id=(select auth.uid()) or (s.organization_id is null and s.author_id=(select auth.uid())) or (s.organization_id is not null and public.is_organization_manager(s.organization_id)))));
drop policy if exists "Members create own story interactions" on public.story_interactions;
create policy "Members create own story interactions" on public.story_interactions for insert to authenticated
with check(user_id=(select auth.uid()) and exists(select 1 from public.stories s where s.id=story_id and s.expires_at>now()));

drop policy if exists "Story participants read views" on public.story_views;
create policy "Story participants read views" on public.story_views for select to authenticated
using(viewer_id=(select auth.uid()) or exists(select 1 from public.stories s where s.id=story_id
  and ((s.organization_id is null and s.author_id=(select auth.uid())) or (s.organization_id is not null and public.is_organization_manager(s.organization_id)))
  and coalesce((select p.show_story_views from public.user_preferences p where p.user_id=viewer_id),true)));
