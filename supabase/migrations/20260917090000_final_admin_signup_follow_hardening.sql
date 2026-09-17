create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = 'admin'
      and is_verified = true
      and is_banned = false
  );
$$;

drop policy if exists "Only admins can change roles" on public.user_roles;
create policy "Only admins can change roles"
on public.user_roles
for update
to authenticated
using ((select public.is_admin()))
with check (
  (select public.is_admin())
  and (
    (user_id = (select auth.uid()) and role = 'admin')
    or
    (user_id <> (select auth.uid()) and role <> 'admin')
  )
);

drop policy if exists "Only admins can insert roles" on public.user_roles;
create policy "Only admins can insert roles"
on public.user_roles
for insert
to authenticated
with check ((select public.is_admin()) and role <> 'admin');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  admin_user_id uuid;
begin
  insert into public.profiles (id, full_name, avatar_url, username)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(new.raw_user_meta_data->>'avatar_url', ''),
    nullif(lower(trim(new.raw_user_meta_data->>'username')), '')
  );

  insert into public.user_roles (user_id, role, is_verified)
  values (new.id, 'user', false)
  on conflict (user_id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  select ur.user_id
  into admin_user_id
  from public.user_roles ur
  where ur.role = 'admin'
    and ur.is_verified = true
    and ur.is_banned = false
    and ur.user_id <> new.id
  order by ur.updated_at asc nulls last, ur.user_id
  limit 1;

  if admin_user_id is not null then
    insert into public.follows (follower_id, following_id)
    values (new.id, admin_user_id)
    on conflict (follower_id, following_id) do nothing;
  end if;

  return new;
end;
$$;

insert into public.follows (follower_id, following_id)
select p.id, a.user_id
from public.profiles p
cross join lateral (
  select ur.user_id
  from public.user_roles ur
  where ur.role = 'admin'
    and ur.is_verified = true
    and ur.is_banned = false
  order by ur.updated_at asc nulls last, ur.user_id
  limit 1
) a
where p.id <> a.user_id
on conflict (follower_id, following_id) do nothing;
