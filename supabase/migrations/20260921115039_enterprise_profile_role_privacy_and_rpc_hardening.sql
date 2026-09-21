-- Live migration parity: enterprise profile/role privacy and privileged RPC hardening.

revoke select on table public.profiles from anon, authenticated;
grant select (
  id, full_name, avatar_url, bio, location, website, country, created_at,
  skills, goal_categories, username, headline, profession, workplace, school,
  cover_url, interests, instagram_url, x_url, tiktok_url, linkedin_url,
  youtube_url, facebook_url
) on table public.profiles to anon, authenticated;

drop policy if exists "Roles are viewable by everyone" on public.user_roles;
drop policy if exists "Users see own role and admins see roles" on public.user_roles;
create policy "Users see own role and admins see roles"
on public.user_roles for select to authenticated
using (user_id=(select auth.uid()) or (select public.is_admin_or_mod()));

revoke select on table public.user_roles from anon;
grant select on table public.user_roles to authenticated;

revoke execute on function public.is_admin() from public,anon;
revoke execute on function public.is_admin_or_mod() from public,anon;
revoke execute on function public.is_banned() from public,anon;
revoke execute on function public.get_skill_directory(text,integer) from public,anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin_or_mod() to authenticated;
grant execute on function public.is_banned() to authenticated;
grant execute on function public.get_skill_directory(text,integer) to authenticated;
