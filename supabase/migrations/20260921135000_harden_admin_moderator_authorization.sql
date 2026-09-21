-- Ensure privileged moderation helpers cannot authorize unverified or banned staff.
-- Keep the helper callable only by authenticated users and service-role processes.

create or replace function public.is_admin_or_mod()
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
      and role in ('admin','moderator')
      and is_verified = true
      and is_banned = false
  );
$$;

revoke all on function public.is_admin_or_mod() from public, anon;
grant execute on function public.is_admin_or_mod() to authenticated, service_role;
