-- Keep content destinations separate from the identity that performed the action.
alter table public.notifications add column if not exists actor_id uuid references public.profiles(id) on delete set null;
alter table public.notifications add column if not exists actor_organization_id uuid references public.organizations(id) on delete set null;
alter table public.notifications add column if not exists actor_name text;

CREATE OR REPLACE FUNCTION public.notify_new_comment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  post_author uuid;
  post_org uuid;
  reply_author uuid;
  actor_name text;
begin
  if new.organization_id is not null then
    select name into actor_name from public.organizations where id = new.organization_id;
  else
    select coalesce(full_name, username, 'Someone') into actor_name
    from public.profiles where id = new.author_id;
  end if;

  if new.parent_id is not null then
    select author_id into reply_author from public.comments where id = new.parent_id;
    if reply_author is not null
       and reply_author is distinct from new.author_id
       and public.social_notifications_enabled(reply_author) then
      insert into public.notifications(actor_id,actor_organization_id,actor_name,user_id,type,title,message,link)
values(new.author_id,new.organization_id,actor_name,
        reply_author,
        'comment_reply',
        coalesce(actor_name,'Someone') || ' replied to your comment',
        left(new.content,140),
        '/post/' || new.post_id::text || '?comment=' || new.id::text
      );
    end if;
  end if;

  select author_id,organization_id into post_author,post_org
  from public.posts where id = new.post_id;

  if post_org is not null then
    insert into public.notifications(actor_id,actor_organization_id,actor_name,user_id,type,title,message,link)
select
      new.author_id,new.organization_id,actor_name,om.user_id,
      'new_comment',
      coalesce(actor_name,'Someone') || ' commented on your organization post',
      left(new.content,140),
      '/post/' || new.post_id::text || '?comment=' || new.id::text
    from public.organization_members om
    where om.organization_id = post_org
      and om.role in ('owner','recruiter')
      and om.user_id is distinct from new.author_id
      and om.user_id is distinct from reply_author
      and public.social_notifications_enabled(om.user_id);
  elsif post_author is not null
     and post_author is distinct from new.author_id
     and post_author is distinct from reply_author
     and public.social_notifications_enabled(post_author) then
    insert into public.notifications(actor_id,actor_organization_id,actor_name,user_id,type,title,message,link)
values(new.author_id,new.organization_id,actor_name,
      post_author,
      'new_comment',
      coalesce(actor_name,'Someone') || ' commented on your post',
      left(new.content,140),
      '/post/' || new.post_id::text || '?comment=' || new.id::text
    );
  end if;

  return new;
end
$function$
;
revoke execute on function public.notify_new_comment() from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.notify_new_reaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  post_author uuid;
  post_org uuid;
  actor_name text;
  reaction_message text;
begin
  if new.post_id is null then return new; end if;

  if new.organization_id is not null then
    select name into actor_name from public.organizations where id = new.organization_id;
  else
    select coalesce(full_name, username, 'Someone') into actor_name
    from public.profiles where id = new.user_id;
  end if;

  reaction_message := case new.type
    when 'like' then '❤️ Like'
    when 'spark' then '✨ Spark'
    when 'insightful' then '💡 Insightful'
    when 'useful' then '👍 Useful'
    else 'New reaction'
  end;

  select author_id,organization_id into post_author,post_org
  from public.posts where id = new.post_id;

  if post_org is not null then
    insert into public.notifications(actor_id,actor_organization_id,actor_name,user_id,type,title,message,link)
select
      new.user_id,new.organization_id,actor_name,om.user_id,
      'post_reaction',
      coalesce(actor_name,'Someone') || ' reacted to your organization post',
      reaction_message,
      '/post/' || new.post_id::text
    from public.organization_members om
    where om.organization_id = post_org
      and om.role in ('owner','recruiter')
      and om.user_id is distinct from new.user_id
      and public.social_notifications_enabled(om.user_id);
  elsif post_author is not null
     and post_author is distinct from new.user_id
     and public.social_notifications_enabled(post_author) then
    insert into public.notifications(actor_id,actor_organization_id,actor_name,user_id,type,title,message,link)
values(new.user_id,new.organization_id,actor_name,post_author,'post_reaction',coalesce(actor_name,'Someone') || ' reacted to your post',reaction_message,'/post/' || new.post_id::text);
  end if;

  return new;
end
$function$
;
revoke execute on function public.notify_new_reaction() from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.notify_comment_reaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_author uuid;
  v_post uuid;
  actor_name text;
begin
  select author_id,post_id into v_author,v_post
  from public.comments
  where id=new.comment_id and deleted_at is null;

  if new.organization_id is not null then
    select name into actor_name from public.organizations where id=new.organization_id;
  else
    select coalesce(full_name,username,'Someone') into actor_name from public.profiles where id=new.user_id;
  end if;

  if v_author is not null and v_author<>new.user_id then
    insert into public.notifications(actor_id,actor_organization_id,actor_name,user_id,type,title,message,link)
values(new.user_id,new.organization_id,actor_name,v_author,'comment_reaction',coalesce(actor_name,'Someone') || ' reacted to your comment','Someone reacted to your comment.','/post/'||v_post::text || '?comment=' || new.comment_id::text);
  end if;

  return new;
end
$function$
;
revoke execute on function public.notify_comment_reaction() from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.notify_comment_like()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  comment_author uuid;
  comment_post uuid;
  actor_name text;
begin
  select author_id, post_id into comment_author, comment_post
  from public.comments where id = new.comment_id;

  if comment_author is null
     or comment_author = new.user_id
     or not public.social_notifications_enabled(comment_author) then
    return new;
  end if;

  select coalesce(full_name, username, 'Someone') into actor_name
  from public.profiles where id = new.user_id;

  insert into public.notifications(actor_id,actor_organization_id,actor_name,user_id,type,title,message,link)
values(new.user_id,null,actor_name,
    comment_author,
    'comment_like',
    coalesce(actor_name,'Someone') || ' liked your comment',
    null,
    '/post/' || comment_post::text || '?comment=' || new.comment_id::text
  );
  return new;
end;
$function$
;
revoke execute on function public.notify_comment_like() from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.notify_comment_mentions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_username text;
  v_user_id uuid;
  v_parent_author uuid;
begin
  if coalesce(new.content,'')='' or new.author_id is null then return new; end if;
  if new.parent_id is not null then
    select author_id into v_parent_author from public.comments where id=new.parent_id;
  end if;

  for v_username in
    select distinct lower(match_arr[1])
    from regexp_matches(new.content,'(?:^|[^A-Za-z0-9_])@([A-Za-z0-9_]{3,24})','g') as t(match_arr)
  loop
    select id into v_user_id
    from public.profiles
    where lower(username)=v_username
    limit 1;

    if v_user_id is not null and v_user_id<>new.author_id and v_user_id is distinct from v_parent_author then
      insert into public.notifications(actor_id,actor_organization_id,actor_name,user_id,type,title,message,link)
values(new.author_id,new.organization_id,coalesce((select name from public.organizations where id=new.organization_id),(select coalesce(full_name,username,'Someone') from public.profiles where id=new.author_id)),v_user_id,'mention','You were tagged','Someone tagged you in a POSSARA discussion.','/post/'||new.post_id::text || '?comment=' || new.id::text);
    end if;
  end loop;

  return new;
end;
$function$
;
revoke execute on function public.notify_comment_mentions() from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.notify_post_mentions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_username text;
  v_user_id uuid;
begin
  if coalesce(new.content,'')='' or new.author_id is null then return new; end if;

  for v_username in
    select distinct lower(match_arr[1])
    from regexp_matches(new.content,'(?:^|[^A-Za-z0-9_])@([A-Za-z0-9_]{3,24})','g') as t(match_arr)
  loop
    select id into v_user_id
    from public.profiles
    where lower(username)=v_username
    limit 1;

    if v_user_id is not null and v_user_id<>new.author_id then
      insert into public.notifications(actor_id,actor_organization_id,actor_name,user_id,type,title,message,link)
values(new.author_id,new.organization_id,coalesce((select name from public.organizations where id=new.organization_id),(select coalesce(full_name,username,'Someone') from public.profiles where id=new.author_id)),v_user_id,'mention','You were tagged','Someone tagged you in a POSSARA post.','/post/'||new.id::text);
    end if;
  end loop;

  return new;
end;
$function$
;
revoke execute on function public.notify_post_mentions() from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.notify_followers_new_post()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  actor_name text;
begin
  if new.status <> 'published' then
    return new;
  end if;

  if new.organization_id is not null then
    select name into actor_name
    from public.organizations
    where id = new.organization_id;

    insert into public.notifications(actor_id,actor_organization_id,actor_name,user_id,type,title,message,link)
select
      new.author_id,new.organization_id,actor_name,f.user_id,
      'organization_post',
      coalesce(actor_name,'An organization') || ' shared an update',
      left(new.content,140),
      '/post/' || new.id::text
    from public.organization_follows f
    where f.organization_id = new.organization_id
      and f.user_id <> new.author_id
      and public.social_notifications_enabled(f.user_id);

    return new;
  end if;

  if new.type <> 'general' or new.category_id is not null then
    return new;
  end if;

  select coalesce(full_name, username, 'Someone') into actor_name
  from public.profiles
  where id = new.author_id;

  insert into public.notifications(actor_id,actor_organization_id,actor_name,user_id,type,title,message,link)
select
    new.author_id,new.organization_id,actor_name,f.follower_id,
    'new_post',
    coalesce(actor_name,'Someone') || ' shared a new post',
    left(new.content,140),
    '/post/' || new.id::text
  from public.follows f
  where f.following_id = new.author_id
    and f.follower_id <> new.author_id
    and public.social_notifications_enabled(f.follower_id);

  return new;
end
$function$
;
revoke execute on function public.notify_followers_new_post() from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.notify_new_follow()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare actor_name text;
begin
  if new.following_id = new.follower_id or not public.social_notifications_enabled(new.following_id) then return new; end if;
  select coalesce(full_name, username, 'Someone') into actor_name from public.profiles where id = new.follower_id;
  insert into public.notifications(actor_id,actor_organization_id,actor_name,user_id,type,title,message,link)
values(new.follower_id,null,actor_name,new.following_id,'new_follower',coalesce(actor_name,'Someone') || ' followed you',null,
         coalesce((select '/profile/' || username from public.profiles where id = new.follower_id and username is not null), '/profile/id/' || new.follower_id::text));
  return new;
end;
$function$
;
revoke execute on function public.notify_new_follow() from public,anon,authenticated;

create or replace function public.notify_followers_new_story()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_name text;
begin
 if new.organization_id is not null then
  select name into v_name from public.organizations where id=new.organization_id;
  insert into public.notifications(user_id,type,title,message,link,actor_id,actor_organization_id,actor_name)
  select f.user_id,'new_moment',coalesce(v_name,'An organization') || ' added a Moment',left(coalesce(new.caption,new.text_body,'View Moment'),140),
    '/moments/'||new.id,new.author_id,new.organization_id,v_name
  from public.organization_follows f where f.organization_id=new.organization_id and f.user_id<>new.author_id
    and public.social_notifications_enabled(f.user_id);
 else
  select coalesce(full_name,username,'Someone') into v_name from public.profiles where id=new.author_id;
  insert into public.notifications(user_id,type,title,message,link,actor_id,actor_name)
  select f.follower_id,'new_moment',coalesce(v_name,'Someone') || ' added a Moment',left(coalesce(new.caption,new.text_body,'View Moment'),140),
    '/moments/'||new.id,new.author_id,v_name
  from public.follows f where f.following_id=new.author_id and f.follower_id<>new.author_id
    and public.social_notifications_enabled(f.follower_id);
 end if;
 return new;
end $$;
revoke execute on function public.notify_followers_new_story() from public,anon,authenticated;

create or replace function public.notify_moment_interaction()
returns trigger language plpgsql security definer set search_path=public as $$
declare s public.stories%rowtype; v_name text;
begin
 select * into s from public.stories where id=new.story_id;
 if s.id is null or s.expires_at<=now() then return new; end if;
 select coalesce(full_name,username,'Someone') into v_name from public.profiles where id=new.user_id;
 insert into public.notifications(user_id,type,title,message,link,actor_id,actor_name)
 select recipient,'moment_'||new.kind,coalesce(v_name,'Someone')||case when new.kind='reply' then ' replied to your Moment' else ' reacted to your Moment' end,
   left(new.body,140),'/moments/'||s.id||'?interaction='||new.id,new.user_id,v_name
 from (
   select s.author_id recipient where s.organization_id is null
   union select user_id from public.organization_members where organization_id=s.organization_id and role in ('owner','recruiter')
 ) recipients where recipient<>new.user_id and public.social_notifications_enabled(recipient);
 return new;
end $$;
revoke execute on function public.notify_moment_interaction() from public,anon,authenticated;
drop trigger if exists on_moment_interaction_notification on public.story_interactions;
create trigger on_moment_interaction_notification after insert on public.story_interactions for each row execute function public.notify_moment_interaction();

-- Recover old destinations only where the author and exact transaction timestamp agree.
update public.notifications n set link='/moments/'||s.id,actor_id=s.author_id,
 actor_name=coalesce(p.full_name,p.username,'Someone'),type='new_moment'
from public.stories s join public.profiles p on p.id=s.author_id
where n.type='new_story' and n.created_at=s.created_at
 and (select count(*) from public.stories candidate where candidate.author_id=s.author_id and candidate.created_at=s.created_at)=1
 and n.link in ('/profile/'||p.username,'/profile/id/'||p.id);
-- Unrecoverable old records must never silently open a different Moment or profile.
update public.notifications set link='/moments/unavailable',type='new_moment' where type='new_story';

-- Suggestions are generated when the member returns, at most once every 3 days.
-- Only the signed-in member can request their own digest.
create schema if not exists private;
create or replace function private.refresh_opportunity_notifications()
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.profiles%rowtype; pref public.user_preferences%rowtype; target uuid:=auth.uid();
begin
 if target is null then raise exception 'Sign in required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(target::text,729));
 select * into p from public.profiles where id=target;
 select * into pref from public.user_preferences where user_id=target;
 if p.id is null or not coalesce(pref.notify_opportunity_matches,true) then return; end if;
 if cardinality(coalesce(p.goal_categories,'{}'))=0 or
   (cardinality(coalesce(p.skills,'{}'))=0 and nullif(trim(p.profession),'') is null) or
   (nullif(trim(p.country),'') is null and nullif(trim(p.location),'') is null and not coalesce(p.remote_opportunities,false)) then
  if not exists(select 1 from public.notifications where user_id=target and type='profile_opportunity_setup' and created_at>now()-interval '14 days') then
   insert into public.notifications(user_id,type,title,message,link)
   values(target,'profile_opportunity_setup','Complete your profile for opportunity suggestions',
    'Add your skills or profession, opportunity interests, and location so we can suggest relevant jobs and opportunities.','/profile/me?edit=1');
  end if;
  return;
 end if;
 if exists(select 1 from public.notifications where user_id=target and type='opportunity_match' and created_at>now()-interval '3 days') then return; end if;
 insert into public.notifications(user_id,type,title,message,link)
 select target,'opportunity_match','An opportunity for you: '||candidate.title,
  'Suggested from your profile interests and skills. Review the requirements to check your eligibility.',candidate.path
 from (
  select o.title,'/opportunities/'||o.id path,o.created_at,
   (case when exists(select 1 from unnest(coalesce(p.skills,'{}')||coalesce(p.interests,'{}')||array[coalesce(p.profession,'')]) term
    where length(trim(term))>=3 and strpos(lower(o.title||' '||o.description||' '||array_to_string(coalesce(o.tags,'{}'),' ')),lower(trim(term)))>0) then 3 else 0 end) score
  from public.opportunities o join public.opportunity_categories c on c.id=o.category_id
  where o.status='active' and (o.deadline is null or o.deadline>now()) and o.author_id is distinct from target
   and c.slug=any(p.goal_categories) and (c.slug<>'admissions' or coalesce(pref.notify_admissions,true))
   and (o.location is null or trim(o.location)='' or lower(o.location)~'(worldwide|global|international)' or
    (coalesce(p.remote_opportunities,false) and lower(o.location) like '%remote%') or
    exists(select 1 from unnest(coalesce(p.preferred_opportunity_countries,'{}')||array[coalesce(p.country,''),coalesce(p.location,'')]) loc
      where length(trim(loc))>=2 and strpos(lower(o.location),lower(trim(loc)))>0))
  union all
  select j.title,'/jobs/'||j.id,j.created_at,4
  from public.job_postings j
  where j.status='open' and (j.closes_at is null or j.closes_at>now()) and j.posted_by is distinct from target
   and 'jobs'=any(p.goal_categories)
   and exists(select 1 from unnest(coalesce(p.skills,'{}')||array[coalesce(p.profession,'')]) term
    where length(trim(term))>=3 and strpos(lower(j.title||' '||coalesce(j.description,'')||' '||array_to_string(coalesce(j.requirements,'{}'),' ')),lower(trim(term)))>0)
   and ((lower(j.work_style)='remote' and coalesce(p.remote_opportunities,false)) or
    exists(select 1 from unnest(coalesce(p.preferred_opportunity_countries,'{}')||array[coalesce(p.country,''),coalesce(p.location,'')]) loc
     where length(trim(loc))>=2 and strpos(lower(coalesce(j.location,'')),lower(trim(loc)))>0))
 ) candidate
 where not exists(select 1 from public.notifications n where n.user_id=target and n.link=candidate.path and n.type in ('opportunity_match','new_opportunity','organization_job'))
 order by candidate.score desc,candidate.created_at desc limit 2;
end $$;
revoke all on function private.refresh_opportunity_notifications() from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.refresh_opportunity_notifications() to authenticated;
create or replace function public.refresh_opportunity_notifications()
returns void language sql security invoker set search_path='' as $$
 select private.refresh_opportunity_notifications();
$$;
revoke all on function public.refresh_opportunity_notifications() from public,anon;
grant execute on function public.refresh_opportunity_notifications() to authenticated;

-- Replace the unbounded broadcast with the occasional personalized digest above.
create or replace function public.notify_users_of_new_active_opportunity()
returns trigger language plpgsql set search_path=public as $$
begin return new; end $$;
revoke execute on function public.notify_users_of_new_active_opportunity() from public,anon,authenticated;
create index if not exists notifications_user_type_created_idx on public.notifications(user_id,type,created_at desc);
