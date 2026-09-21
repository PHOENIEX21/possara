-- Repair legacy post notification links so every notification opens a real route.

create or replace function public.notify_followers_new_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

    insert into public.notifications(user_id,type,title,message,link)
    select
      f.user_id,
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

  insert into public.notifications(user_id,type,title,message,link)
  select
    f.follower_id,
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
$$;

create or replace function public.notify_new_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author uuid;
  reply_author uuid;
  actor_name text;
begin
  select coalesce(full_name, username, 'Someone') into actor_name
  from public.profiles where id = new.author_id;

  if new.parent_id is not null then
    select author_id into reply_author from public.comments where id = new.parent_id;
    if reply_author is not null
       and reply_author is distinct from new.author_id
       and public.social_notifications_enabled(reply_author) then
      insert into public.notifications(user_id,type,title,message,link)
      values(
        reply_author,
        'comment_reply',
        coalesce(actor_name,'Someone') || ' replied to your comment',
        left(new.content,140),
        '/post/' || new.post_id::text
      );
    end if;
  end if;

  select author_id into post_author from public.posts where id = new.post_id;
  if post_author is not null
     and post_author is distinct from new.author_id
     and post_author is distinct from reply_author
     and public.social_notifications_enabled(post_author) then
    insert into public.notifications(user_id,type,title,message,link)
    values(
      post_author,
      'new_comment',
      coalesce(actor_name,'Someone') || ' commented on your post',
      left(new.content,140),
      '/post/' || new.post_id::text
    );
  end if;
  return new;
end;
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
  values(
    post_author,
    'post_reaction',
    coalesce(actor_name,'Someone') || ' reacted to your post',
    case new.type
      when 'like' then '❤️ Like'
      when 'spark' then '✨ Spark'
      when 'insightful' then '💡 Insightful'
      when 'useful' then '👍 Useful'
      else 'New reaction'
    end,
    '/post/' || new.post_id::text
  );
  return new;
end;
$$;

update public.notifications
set link = regexp_replace(link, '^/\?post=', '/post/')
where link like '/?post=%';

revoke execute on function public.notify_followers_new_post() from public, anon, authenticated;
revoke execute on function public.notify_new_comment() from public, anon, authenticated;
revoke execute on function public.notify_new_reaction() from public, anon, authenticated;
