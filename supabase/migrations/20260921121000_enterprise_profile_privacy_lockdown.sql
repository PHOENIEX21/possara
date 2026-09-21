-- Enterprise privacy lockdown.
-- Apply only after the frontend has switched private self-data reads to get_my_profile/get_my_account_state.

revoke select on public.profiles from anon, authenticated;
grant select (
  id,full_name,avatar_url,bio,location,website,country,created_at,education_level,
  skills,goal_categories,username,headline,profession,workplace,school,cover_url,
  interests,instagram_url,x_url,tiktok_url,linkedin_url,youtube_url,facebook_url
) on public.profiles to anon, authenticated;

revoke select on public.user_roles from anon, authenticated;
grant select (user_id,role,is_verified) on public.user_roles to anon, authenticated;

revoke select on public.member_stats from anon, authenticated;
