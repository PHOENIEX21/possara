-- Live migration parity: privacy-safe public profile RPCs.

create or replace function public.get_public_profile(target_user_id uuid)
returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'id',p.id,'full_name',p.full_name,'avatar_url',p.avatar_url,'bio',p.bio,
    'location',p.location,'website',p.website,'country',p.country,'created_at',p.created_at,
    'skills',p.skills,'goal_categories',p.goal_categories,'username',p.username,
    'headline',p.headline,'profession',p.profession,'workplace',p.workplace,'school',p.school,
    'cover_url',p.cover_url,'interests',p.interests,'instagram_url',p.instagram_url,
    'x_url',p.x_url,'tiktok_url',p.tiktok_url,'linkedin_url',p.linkedin_url,
    'youtube_url',p.youtube_url,'facebook_url',p.facebook_url,
    'birthday_month',case
      when p.birthday_visibility='everyone' then p.birthday_month
      when p.birthday_visibility='followers' and auth.uid() is not null
        and (auth.uid()=p.id or exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.following_id=p.id))
        then p.birthday_month
      when auth.uid()=p.id then p.birthday_month else null end,
    'birthday_day',case
      when p.birthday_visibility='everyone' then p.birthday_day
      when p.birthday_visibility='followers' and auth.uid() is not null
        and (auth.uid()=p.id or exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.following_id=p.id))
        then p.birthday_day
      when auth.uid()=p.id then p.birthday_day else null end,
    'birthday_visibility',p.birthday_visibility
  ) from public.profiles p where p.id=target_user_id;
$$;

create or replace function public.get_public_profile_by_username(target_username text)
returns jsonb language sql stable security definer set search_path=public as $$
  select public.get_public_profile(p.id)
  from public.profiles p
  where lower(p.username)=lower(trim(target_username))
  limit 1;
$$;

revoke execute on function public.get_public_profile(uuid) from public;
revoke execute on function public.get_public_profile_by_username(text) from public;
grant execute on function public.get_public_profile(uuid) to anon,authenticated;
grant execute on function public.get_public_profile_by_username(text) to anon,authenticated;
