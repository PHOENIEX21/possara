create or replace function public.social_notifications_enabled(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select notify_social from public.user_preferences where user_id = target_user), true);
$$;

create or replace function public.notify_new_reaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author uuid;
  actor_name text;
begin
  if new.post_id is null then return new; end if;
  select author_id into post_author from public.posts where id = new.post_id;
  if post_author is null or post_author = new.user_id or not public.social_notifications_enabled(post_author) then return new; end if;
  select coalesce(full_name, username, 'Someone') into actor_name from public.profiles where id = new.user_id;
  insert into public.notifications(user_id,type,title,message,link)
  values(post_author,'post_reaction',coalesce(actor_name,'Someone') || ' reacted to your post',
         case new.type when 'like' then '❤️ Like' when 'spark' then '✨ Spark' when 'insightful' then '💡 Insightful' when 'useful' then '👍 Useful' else 'New reaction' end,
         '/?post=' || new.post_id::text);
  return new;
end;
$$;

drop trigger if exists on_new_reaction on public.reactions;
create trigger on_new_reaction after insert on public.reactions for each row execute function public.notify_new_reaction();

create or replace function public.notify_new_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text;
begin
  if new.following_id = new.follower_id or not public.social_notifications_enabled(new.following_id) then return new; end if;
  select coalesce(full_name, username, 'Someone') into actor_name from public.profiles where id = new.follower_id;
  insert into public.notifications(user_id,type,title,message,link)
  values(new.following_id,'new_follower',coalesce(actor_name,'Someone') || ' followed you',null,
         coalesce((select '/profile/' || username from public.profiles where id = new.follower_id and username is not null), '/profile/id/' || new.follower_id::text));
  return new;
end;
$$;

drop trigger if exists on_new_follow on public.follows;
create trigger on_new_follow after insert on public.follows for each row execute function public.notify_new_follow();

create or replace function public.notify_followers_new_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text;
begin
  if new.status <> 'published' or new.type <> 'general' or new.category_id is not null then return new; end if;
  select coalesce(full_name, username, 'Someone') into actor_name from public.profiles where id = new.author_id;
  insert into public.notifications(user_id,type,title,message,link)
  select f.follower_id,'new_post',coalesce(actor_name,'Someone') || ' shared a new post',left(new.content,140),'/?post=' || new.id::text
  from public.follows f
  where f.following_id = new.author_id
    and f.follower_id <> new.author_id
    and public.social_notifications_enabled(f.follower_id);
  return new;
end;
$$;

drop trigger if exists on_new_post_notification on public.posts;
create trigger on_new_post_notification after insert on public.posts for each row execute function public.notify_followers_new_post();

create or replace function public.notify_followers_new_story()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor_name text;
begin
  select coalesce(full_name, username, 'Someone') into actor_name from public.profiles where id = new.author_id;
  insert into public.notifications(user_id,type,title,message,link)
  select f.follower_id,'new_story',coalesce(actor_name,'Someone') || ' added a new Moment',coalesce(left(new.caption,140),'Tap to view their latest Moment'),
         coalesce((select '/profile/' || username from public.profiles where id = new.author_id and username is not null), '/profile/id/' || new.author_id::text)
  from public.follows f
  where f.following_id = new.author_id
    and f.follower_id <> new.author_id
    and public.social_notifications_enabled(f.follower_id);
  return new;
end;
$$;

drop trigger if exists on_new_story_notification on public.stories;
create trigger on_new_story_notification after insert on public.stories for each row execute function public.notify_followers_new_story();

create or replace function public.notify_new_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare post_author uuid; actor_name text;
begin
  select author_id into post_author from public.posts where id = new.post_id;
  if post_author is not null and post_author is distinct from new.author_id and public.social_notifications_enabled(post_author) then
    select coalesce(full_name, username, 'Someone') into actor_name from public.profiles where id = new.author_id;
    insert into public.notifications(user_id,type,title,message,link)
    values(post_author,'new_comment',coalesce(actor_name,'Someone') || ' commented on your post',left(new.content,140),'/?post=' || new.post_id::text);
  end if;
  return new;
end;
$$;
