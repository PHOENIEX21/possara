-- Enterprise security foundation: server-side verification, safer privileged RPCs, abuse controls and upload limits.

create or replace function public.get_my_profile()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select to_jsonb(p) - 'email_verified_at'
  from public.profiles p
  where p.id = auth.uid();
$$;
revoke execute on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated;

create or replace function public.get_my_account_state()
returns table(
  role text,
  is_verified boolean,
  is_banned boolean,
  ban_reason text,
  email_verified_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(ur.role,'user')::text,
    coalesce(ur.is_verified,false),
    coalesce(ur.is_banned,false),
    ur.ban_reason,
    p.email_verified_at
  from public.profiles p
  left join public.user_roles ur on ur.user_id=p.id
  where p.id=auth.uid();
$$;
revoke execute on function public.get_my_account_state() from public, anon;
grant execute on function public.get_my_account_state() to authenticated;

create or replace function public.get_public_member_stats()
returns table(total_members bigint, online_now bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*)::bigint,
    count(*) filter (
      where coalesce(pref.show_online_status,true)
        and p.last_seen_at is not null
        and p.last_seen_at > now() - interval '2 minutes'
    )::bigint
  from public.profiles p
  left join public.user_preferences pref on pref.user_id=p.id;
$$;
revoke execute on function public.get_public_member_stats() from public;
grant execute on function public.get_public_member_stats() to anon, authenticated;

drop policy if exists "Owners can update own organization" on public.organizations;
create policy "Owners can update own organization"
on public.organizations
for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create or replace function public.require_verified_member_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.email_verified_at is not null
  ) then
    raise exception 'Verify your email before using this feature.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;
revoke execute on function public.require_verified_member_write() from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'advertisements','birthday_wishes','comment_likes','comment_reactions','comments',
    'follows','growth_passport_items','interview_questions','job_applications',
    'job_cbt_answers','job_cbt_attempts','job_cbt_questions','job_postings',
    'message_reactions','messages','milestones','music_tracks','opportunities',
    'opportunity_application_tasks','opportunity_applications','organization_follows',
    'organization_members','organizations','posts','reactions','reports','saves',
    'screening_questions','stories','story_views','study_answers','study_attempts',
    'study_profiles','study_threads'
  ]
  loop
    execute format('drop trigger if exists require_verified_member_write on public.%I', t);
    execute format(
      'create trigger require_verified_member_write before insert or update on public.%I for each row execute function public.require_verified_member_write()',
      t
    );
  end loop;
end;
$$;

create table if not exists public.auth_abuse_limits (
  action text not null,
  key_hash text not null,
  window_started_at timestamptz not null default now(),
  hit_count integer not null default 0 check (hit_count >= 0),
  updated_at timestamptz not null default now(),
  primary key(action,key_hash)
);
alter table public.auth_abuse_limits enable row level security;
revoke all on public.auth_abuse_limits from anon, authenticated;
grant all on public.auth_abuse_limits to service_role;
drop policy if exists "No client access to auth abuse limits" on public.auth_abuse_limits;
create policy "No client access to auth abuse limits"
on public.auth_abuse_limits for all to anon, authenticated
using(false) with check(false);

create or replace function public.consume_auth_abuse_limit(
  p_action text,
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns table(allowed boolean, retry_after_seconds integer, remaining integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_count integer;
  v_window timestamptz;
begin
  if nullif(trim(p_action),'') is null or nullif(trim(p_key_hash),'') is null then
    raise exception 'Rate-limit key is required';
  end if;
  if p_limit < 1 or p_limit > 10000 or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'Invalid rate-limit configuration';
  end if;

  insert into public.auth_abuse_limits(action,key_hash,window_started_at,hit_count,updated_at)
  values(trim(p_action),trim(p_key_hash),v_now,1,v_now)
  on conflict(action,key_hash) do update
  set
    hit_count = case
      when public.auth_abuse_limits.window_started_at + make_interval(secs => p_window_seconds) <= excluded.updated_at
        then 1
      else public.auth_abuse_limits.hit_count + 1
    end,
    window_started_at = case
      when public.auth_abuse_limits.window_started_at + make_interval(secs => p_window_seconds) <= excluded.updated_at
        then excluded.updated_at
      else public.auth_abuse_limits.window_started_at
    end,
    updated_at = excluded.updated_at
  returning hit_count,window_started_at into v_count,v_window;

  allowed := v_count <= p_limit;
  remaining := greatest(p_limit-v_count,0);
  retry_after_seconds := case
    when allowed then 0
    else greatest(1,ceil(extract(epoch from ((v_window + make_interval(secs => p_window_seconds))-v_now)))::integer)
  end;
  return next;
end;
$$;
revoke execute on function public.consume_auth_abuse_limit(text,text,integer,integer) from public, anon, authenticated;
grant execute on function public.consume_auth_abuse_limit(text,text,integer,integer) to service_role;

do $$
declare
  r record;
begin
  for r in
    select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and pg_get_function_result(p.oid) in ('trigger','event_trigger')
  loop
    execute format(
      'revoke execute on function %I.%I(%s) from public, anon, authenticated',
      r.nspname,r.proname,r.args
    );
  end loop;
end;
$$;

revoke execute on function public.get_social_status(uuid) from anon;
grant execute on function public.get_social_status(uuid) to authenticated;
revoke execute on function public.social_notifications_enabled(uuid) from public, anon, authenticated;

update storage.buckets
set file_size_limit=8388608,
    allowed_mime_types=array['image/jpeg','image/png','image/webp']
where id='avatars';

update storage.buckets
set file_size_limit=8388608,
    allowed_mime_types=array['image/jpeg','image/png','image/webp']
where id='opportunity-media';

update storage.buckets
set file_size_limit=10485760,
    allowed_mime_types=array['application/pdf','image/jpeg','image/png','image/webp']
where id='verification-docs';
