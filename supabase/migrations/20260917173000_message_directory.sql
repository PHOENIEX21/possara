create or replace function public.get_message_directory(
  search_text text default null,
  result_limit integer default 100
)
returns table(
  id uuid,
  full_name text,
  username text,
  avatar_url text,
  headline text,
  online boolean,
  last_seen_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.full_name,
    p.username,
    p.avatar_url,
    p.headline,
    (
      coalesce(up.show_online_status, true)
      and p.last_seen_at is not null
      and p.last_seen_at > now() - interval '2 minutes'
    ) as online,
    case
      when coalesce(up.show_online_status, true) then p.last_seen_at
      else null
    end as last_seen_at
  from public.profiles p
  left join public.user_preferences up on up.user_id = p.id
  where auth.uid() is not null
    and p.id <> auth.uid()
    and (
      nullif(trim(search_text), '') is null
      or coalesce(p.full_name, '') ilike '%' || trim(search_text) || '%'
      or coalesce(p.username, '') ilike '%' || trim(search_text) || '%'
    )
  order by
    (
      coalesce(up.show_online_status, true)
      and p.last_seen_at is not null
      and p.last_seen_at > now() - interval '2 minutes'
    ) desc,
    lower(coalesce(p.full_name, p.username, '')) asc
  limit greatest(1, least(coalesce(result_limit, 100), 100));
$$;

create or replace function public.get_online_member_count()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint
  from public.profiles p
  left join public.user_preferences up on up.user_id = p.id
  where auth.uid() is not null
    and p.id <> auth.uid()
    and coalesce(up.show_online_status, true)
    and p.last_seen_at is not null
    and p.last_seen_at > now() - interval '2 minutes';
$$;

revoke all on function public.get_message_directory(text, integer) from public;
revoke all on function public.get_online_member_count() from public;
grant execute on function public.get_message_directory(text, integer) to authenticated;
grant execute on function public.get_online_member_count() to authenticated;
