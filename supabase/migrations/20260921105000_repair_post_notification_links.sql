-- Repair legacy post notification links without overriding organization-aware
-- comment/reaction notification functions established by the preceding social-identity migration.

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

-- Repair existing legacy notification rows in-place.
update public.notifications
set link = regexp_replace(link, '^/\?post=', '/post/')
where link like '/?post=%';

revoke execute on function public.notify_followers_new_post() from public, anon, authenticated;
revoke execute on function public.notify_new_comment() from public, anon, authenticated;
revoke execute on function public.notify_new_reaction() from public, anon, authenticated;
revoke execute on function public.notify_comment_reaction() from public, anon, authenticated;
