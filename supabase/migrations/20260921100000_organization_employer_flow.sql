-- Organization/employer flow repair.
-- Verification controls trust badges; it must not block legitimate job publishing.

drop trigger if exists enforce_verified_job_publish on public.job_postings;
drop function if exists public.enforce_verified_job_publish();

alter table public.posts
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

create index if not exists posts_organization_created_idx
  on public.posts (organization_id, created_at desc)
  where organization_id is not null and deleted_at is null;

drop policy if exists "Users can create posts" on public.posts;
create policy "Users can create posts"
on public.posts for insert
to authenticated
with check (
  (select auth.uid()) = author_id
  and not public.is_banned()
  and (
    organization_id is null
    or exists (
      select 1
      from public.organization_members om
      where om.organization_id = posts.organization_id
        and om.user_id = (select auth.uid())
        and om.role in ('owner','recruiter')
    )
  )
);

drop policy if exists "Users can update own posts" on public.posts;
drop policy if exists "Users can update own or managed organization posts" on public.posts;
create policy "Users can update own or managed organization posts"
on public.posts for update
to authenticated
using (
  (select auth.uid()) = author_id
  or (
    organization_id is not null
    and exists (
      select 1
      from public.organization_members om
      where om.organization_id = posts.organization_id
        and om.user_id = (select auth.uid())
        and om.role in ('owner','recruiter')
    )
  )
)
with check (
  not public.is_banned()
  and (
    (organization_id is null and (select auth.uid()) = author_id)
    or (
      organization_id is not null
      and exists (
        select 1
        from public.organization_members om
        where om.organization_id = posts.organization_id
          and om.user_id = (select auth.uid())
          and om.role in ('owner','recruiter')
      )
    )
  )
);

create or replace function public.guard_post_identity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.author_id is distinct from old.author_id
     or new.organization_id is distinct from old.organization_id then
    raise exception 'Post author identity cannot be changed after publishing';
  end if;
  return new;
end
$$;

drop trigger if exists guard_post_identity on public.posts;
create trigger guard_post_identity
before update on public.posts
for each row execute function public.guard_post_identity();

drop policy if exists "Users follow organizations" on public.organization_follows;
create policy "Users follow organizations"
on public.organization_follows for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and not exists (
    select 1
    from public.organization_members om
    where om.organization_id = organization_follows.organization_id
      and om.user_id = (select auth.uid())
  )
);

delete from public.organization_follows f
using public.organization_members om
where om.organization_id = f.organization_id
  and om.user_id = f.user_id;

create or replace function public.notify_organization_followers_job_open()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  org_name text;
begin
  if new.status <> 'open' then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'open' then return new; end if;

  select name into org_name from public.organizations where id = new.organization_id;

  insert into public.notifications(user_id,type,title,message,link)
  select
    f.user_id,
    'organization_job',
    coalesce(org_name,'An organization') || ' is hiring: ' || new.title,
    concat_ws(' · ', nullif(new.location,''), nullif(new.employment_type,''), nullif(new.work_style,'')),
    '/jobs/' || new.id::text
  from public.organization_follows f
  where f.organization_id = new.organization_id
    and f.user_id <> new.posted_by
    and public.social_notifications_enabled(f.user_id);

  return new;
end
$$;

drop trigger if exists notify_organization_followers_job_open on public.job_postings;
create trigger notify_organization_followers_job_open
after insert or update of status on public.job_postings
for each row execute function public.notify_organization_followers_job_open();

create or replace function public.notify_followers_new_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
begin
  if new.status <> 'published' then return new; end if;

  if new.organization_id is not null then
    select name into actor_name from public.organizations where id = new.organization_id;
    insert into public.notifications(user_id,type,title,message,link)
    select
      f.user_id,
      'organization_post',
      coalesce(actor_name,'An organization') || ' shared an update',
      left(new.content,140),
      '/?post=' || new.id::text
    from public.organization_follows f
    where f.organization_id = new.organization_id
      and f.user_id <> new.author_id
      and public.social_notifications_enabled(f.user_id);
    return new;
  end if;

  if new.type <> 'general' or new.category_id is not null then return new; end if;

  select coalesce(full_name, username, 'Someone') into actor_name
  from public.profiles where id = new.author_id;

  insert into public.notifications(user_id,type,title,message,link)
  select
    f.follower_id,
    'new_post',
    coalesce(actor_name,'Someone') || ' shared a new post',
    left(new.content,140),
    '/?post=' || new.id::text
  from public.follows f
  where f.following_id = new.author_id
    and f.follower_id <> new.author_id
    and public.social_notifications_enabled(f.follower_id);

  return new;
end
$$;

create or replace function public.normalize_literal_newlines()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_table_name='posts' then
    new.content:=replace(new.content,E'\\n',E'\n');
  elsif tg_table_name='comments' then
    new.content:=replace(new.content,E'\\n',E'\n');
  elsif tg_table_name='notifications' then
    new.title:=replace(new.title,E'\\n',' ');
    new.message:=replace(new.message,E'\\n',E'\n');
  elsif tg_table_name='opportunities' then
    new.title:=replace(new.title,E'\\n',' ');
    new.description:=replace(new.description,E'\\n',E'\n');
    new.eligibility:=replace(new.eligibility,E'\\n',E'\n');
  elsif tg_table_name='job_postings' then
    new.title:=replace(new.title,E'\\n',' ');
    new.description:=replace(new.description,E'\\n',E'\n');
    new.requirements:=array(select replace(value,E'\\n',' ') from unnest(new.requirements) as value);
  elsif tg_table_name='screening_questions' then
    new.question_text:=replace(new.question_text,E'\\n',' ');
  elsif tg_table_name='organizations' then
    new.name:=replace(new.name,E'\\n',' ');
    new.description:=replace(new.description,E'\\n',E'\n');
    new.location:=replace(new.location,E'\\n',' ');
    new.headquarters:=replace(new.headquarters,E'\\n',' ');
  elsif tg_table_name='profiles' then
    new.full_name:=replace(new.full_name,E'\\n',' ');
    new.headline:=replace(new.headline,E'\\n',' ');
    new.bio:=replace(new.bio,E'\\n',E'\n');
  elsif tg_table_name='messages' then
    new.content:=replace(new.content,E'\\n',E'\n');
  elsif tg_table_name='stories' then
    new.caption:=replace(new.caption,E'\\n',E'\n');
    new.text_body:=replace(new.text_body,E'\\n',E'\n');
  elsif tg_table_name='advertisements' then
    new.title:=replace(new.title,E'\\n',' ');
    new.description:=replace(new.description,E'\\n',E'\n');
  end if;
  return new;
end
$$;

drop trigger if exists normalize_literal_newlines_organizations on public.organizations;
create trigger normalize_literal_newlines_organizations before insert or update on public.organizations for each row execute function public.normalize_literal_newlines();
drop trigger if exists normalize_literal_newlines_profiles on public.profiles;
create trigger normalize_literal_newlines_profiles before insert or update on public.profiles for each row execute function public.normalize_literal_newlines();
drop trigger if exists normalize_literal_newlines_messages on public.messages;
create trigger normalize_literal_newlines_messages before insert or update on public.messages for each row execute function public.normalize_literal_newlines();
drop trigger if exists normalize_literal_newlines_stories on public.stories;
create trigger normalize_literal_newlines_stories before insert or update on public.stories for each row execute function public.normalize_literal_newlines();
drop trigger if exists normalize_literal_newlines_advertisements on public.advertisements;
create trigger normalize_literal_newlines_advertisements before insert or update on public.advertisements for each row execute function public.normalize_literal_newlines();

revoke execute on function public.notify_organization_followers_job_open() from public, anon, authenticated;
revoke execute on function public.notify_followers_new_post() from public, anon, authenticated;
