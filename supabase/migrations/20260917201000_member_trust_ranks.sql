create or replace function public.get_member_trust_ranks(p_user_ids uuid[])
returns table(
  user_id uuid,
  rank_key text,
  label text,
  score integer,
  official boolean,
  profile_score integer,
  age_score integer,
  participation_score integer,
  contribution_score integer,
  community_score integer,
  safety_score integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
with requested as (
  select distinct requested_id as user_id
  from unnest(coalesce(p_user_ids, '{}'::uuid[])) requested_id
  where requested_id is not null
  limit 100
),
base as (
  select
    p.id as user_id,
    p.full_name,
    p.username,
    p.avatar_url,
    p.headline,
    p.profession,
    p.bio,
    p.location,
    p.country,
    p.skills,
    p.onboarding_completed,
    au.created_at as auth_created_at,
    au.email_confirmed_at,
    coalesce(ur.role, 'user') as role,
    coalesce(ur.is_verified, false) as is_verified,
    coalesce(ur.is_banned, false) as is_banned
  from requested r
  join public.profiles p on p.id = r.user_id
  left join auth.users au on au.id = p.id
  left join public.user_roles ur on ur.user_id = p.id
),
activity_days as (
  select user_id, count(distinct active_day)::integer as active_days
  from (
    select author_id as user_id, created_at::date as active_day
    from public.posts
    where author_id in (select user_id from requested)
      and status = 'published'
      and deleted_at is null
    union all
    select author_id, created_at::date
    from public.comments
    where author_id in (select user_id from requested)
      and deleted_at is null
    union all
    select author_id, created_at::date
    from public.study_threads
    where author_id in (select user_id from requested)
    union all
    select author_id, created_at::date
    from public.study_answers
    where author_id in (select user_id from requested)
  ) activity
  where user_id is not null
  group by user_id
),
participation as (
  select
    b.user_id,
    least(15, coalesce(a.active_days, 0))::integer as active_day_points,
    least(5, (
      select count(*)::integer
      from public.posts p
      where p.author_id = b.user_id
        and p.status = 'published'
        and p.deleted_at is null
    ))::integer as post_points,
    least(5, (
      select count(*)::integer
      from public.comments c
      where c.author_id = b.user_id
        and c.deleted_at is null
    ))::integer as comment_points
  from base b
  left join activity_days a on a.user_id = b.user_id
),
contributions as (
  select
    b.user_id,
    least(9, 3 * (
      select count(*)::integer
      from public.opportunities o
      where o.author_id = b.user_id
        and o.status = 'active'
    ))::integer as opportunity_points,
    least(6, 2 * (
      select count(*)::integer
      from public.growth_passport_items g
      where g.user_id = b.user_id
        and g.verified = true
    ))::integer as verified_growth_points
  from base b
),
confirmed_actions as (
  select r.id, p.author_id as user_id
  from public.reports r
  join public.posts p on p.id = r.post_id
  where r.status = 'resolved'
    and nullif(trim(coalesce(r.action_taken, '')), '') is not null
    and p.author_id in (select user_id from requested)
  union
  select r.id, o.author_id
  from public.reports r
  join public.opportunities o on o.id = r.opportunity_id
  where r.status = 'resolved'
    and nullif(trim(coalesce(r.action_taken, '')), '') is not null
    and o.author_id in (select user_id from requested)
),
scored as (
  select
    b.*,
    (
      case when b.email_confirmed_at is not null then 5 else 0 end
      + case when nullif(trim(coalesce(b.full_name, '')), '') is not null
                  and nullif(trim(coalesce(b.username, '')), '') is not null then 4 else 0 end
      + case when b.avatar_url is not null then 4 else 0 end
      + case when nullif(trim(coalesce(b.headline, b.profession, '')), '') is not null then 3 else 0 end
      + case when nullif(trim(coalesce(b.bio, '')), '') is not null then 3 else 0 end
      + case when nullif(trim(coalesce(b.location, b.country, '')), '') is not null then 2 else 0 end
      + case when coalesce(cardinality(b.skills), 0) >= 2 then 2 else 0 end
      + case when b.onboarding_completed then 2 else 0 end
    )::integer as profile_score,
    (
      case
        when b.auth_created_at is null then 0
        when b.auth_created_at <= now() - interval '365 days' then 15
        when b.auth_created_at <= now() - interval '180 days' then 13
        when b.auth_created_at <= now() - interval '90 days' then 11
        when b.auth_created_at <= now() - interval '30 days' then 8
        when b.auth_created_at <= now() - interval '7 days' then 5
        else 2
      end
    )::integer as age_score,
    (p.active_day_points + p.post_points + p.comment_points)::integer as participation_score,
    (c.opportunity_points + c.verified_growth_points)::integer as contribution_score,
    greatest(0, 10 - 5 * (
      select count(*)::integer
      from confirmed_actions ca
      where ca.user_id = b.user_id
    ))::integer as community_score,
    (case when b.is_banned then 0 else 10 end)::integer as safety_score
  from base b
  join participation p using (user_id)
  join contributions c using (user_id)
),
finalized as (
  select
    s.*,
    case
      when s.role = 'admin' and s.is_verified and not s.is_banned then 100
      when s.is_banned then 0
      else least(100, s.profile_score + s.age_score + s.participation_score + s.contribution_score + s.community_score + s.safety_score)
    end::integer as total_score,
    (s.role = 'admin' and s.is_verified and not s.is_banned) as is_official
  from scored s
)
select
  f.user_id,
  case
    when f.is_official then 'official'
    when f.is_banned then 'restricted'
    when f.total_score >= 90 then 'diamond'
    when f.total_score >= 75 then 'platinum'
    when f.total_score >= 55 then 'gold'
    when f.total_score >= 35 then 'silver'
    else 'bronze'
  end as rank_key,
  case
    when f.is_official then 'Official'
    when f.is_banned then 'Restricted'
    when f.total_score >= 90 then 'Diamond'
    when f.total_score >= 75 then 'Platinum'
    when f.total_score >= 55 then 'Gold'
    when f.total_score >= 35 then 'Silver'
    else 'Bronze'
  end as label,
  f.total_score as score,
  f.is_official as official,
  f.profile_score,
  f.age_score,
  f.participation_score,
  f.contribution_score,
  f.community_score,
  f.safety_score
from finalized f;
$$;

revoke all on function public.get_member_trust_ranks(uuid[]) from public;
revoke execute on function public.get_member_trust_ranks(uuid[]) from anon;
grant execute on function public.get_member_trust_ranks(uuid[]) to authenticated;
