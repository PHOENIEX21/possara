-- POSSARA social depth, mentions, skill discovery and verified-source auto-publishing.

create table if not exists public.comment_reactions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'like' check (type in ('like','spark','insightful','useful')),
  created_at timestamptz not null default now(),
  unique (comment_id,user_id)
);

create index if not exists comment_reactions_comment_idx on public.comment_reactions(comment_id,created_at desc);
create index if not exists comment_reactions_user_idx on public.comment_reactions(user_id,created_at desc);
alter table public.comment_reactions enable row level security;

drop policy if exists "Comment reactions are viewable by everyone" on public.comment_reactions;
create policy "Comment reactions are viewable by everyone"
on public.comment_reactions for select using (true);

drop policy if exists "Members react to comments as themselves" on public.comment_reactions;
create policy "Members react to comments as themselves"
on public.comment_reactions for insert
with check (auth.uid()=user_id and not public.is_banned());

drop policy if exists "Members change own comment reactions" on public.comment_reactions;
create policy "Members change own comment reactions"
on public.comment_reactions for update
using (auth.uid()=user_id)
with check (auth.uid()=user_id and not public.is_banned());

drop policy if exists "Members remove own comment reactions" on public.comment_reactions;
create policy "Members remove own comment reactions"
on public.comment_reactions for delete
using (auth.uid()=user_id);

create or replace function public.notify_comment_reply()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_parent_author uuid;
begin
  if new.parent_id is null then return new; end if;

  select author_id into v_parent_author
  from public.comments
  where id=new.parent_id and post_id=new.post_id;

  if v_parent_author is not null and v_parent_author<>new.author_id then
    insert into public.notifications(user_id,type,title,message,link)
    values(v_parent_author,'comment_reply','New reply','Someone replied to your comment.','/post/'||new.post_id::text);
  end if;

  return new;
end;
$$;

drop trigger if exists comments_notify_reply on public.comments;
create trigger comments_notify_reply
after insert on public.comments
for each row execute function public.notify_comment_reply();

create or replace function public.notify_comment_reaction()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_author uuid;
  v_post uuid;
begin
  select author_id,post_id into v_author,v_post
  from public.comments
  where id=new.comment_id and deleted_at is null;

  if v_author is not null and v_author<>new.user_id then
    insert into public.notifications(user_id,type,title,message,link)
    values(v_author,'comment_reaction','New comment reaction','Someone reacted to your comment.','/post/'||v_post::text);
  end if;

  return new;
end;
$$;

drop trigger if exists comment_reactions_notify on public.comment_reactions;
create trigger comment_reactions_notify
after insert on public.comment_reactions
for each row execute function public.notify_comment_reaction();

create or replace function public.notify_post_mentions()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_username text;
  v_user_id uuid;
begin
  if coalesce(new.content,'')='' or new.author_id is null then return new; end if;

  for v_username in
    select distinct lower(match_arr[1])
    from regexp_matches(new.content,'(?:^|[^A-Za-z0-9_])@([A-Za-z0-9_]{3,24})','g') as t(match_arr)
  loop
    select id into v_user_id
    from public.profiles
    where lower(username)=v_username
    limit 1;

    if v_user_id is not null and v_user_id<>new.author_id then
      insert into public.notifications(user_id,type,title,message,link)
      values(v_user_id,'mention','You were tagged','Someone tagged you in a POSSARA post.','/post/'||new.id::text);
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists posts_notify_mentions on public.posts;
create trigger posts_notify_mentions
after insert on public.posts
for each row execute function public.notify_post_mentions();

create or replace function public.notify_comment_mentions()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_username text;
  v_user_id uuid;
  v_parent_author uuid;
begin
  if coalesce(new.content,'')='' or new.author_id is null then return new; end if;
  if new.parent_id is not null then
    select author_id into v_parent_author from public.comments where id=new.parent_id;
  end if;

  for v_username in
    select distinct lower(match_arr[1])
    from regexp_matches(new.content,'(?:^|[^A-Za-z0-9_])@([A-Za-z0-9_]{3,24})','g') as t(match_arr)
  loop
    select id into v_user_id
    from public.profiles
    where lower(username)=v_username
    limit 1;

    if v_user_id is not null and v_user_id<>new.author_id and v_user_id is distinct from v_parent_author then
      insert into public.notifications(user_id,type,title,message,link)
      values(v_user_id,'mention','You were tagged','Someone tagged you in a POSSARA discussion.','/post/'||new.post_id::text);
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists comments_notify_mentions on public.comments;
create trigger comments_notify_mentions
after insert on public.comments
for each row execute function public.notify_comment_mentions();

create table if not exists public.skill_directory (
  id uuid primary key default gen_random_uuid(),
  normalized_name text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_skill_links (
  user_id uuid not null references public.profiles(id) on delete cascade,
  skill_id uuid not null references public.skill_directory(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id,skill_id)
);

create index if not exists profile_skill_links_skill_idx on public.profile_skill_links(skill_id,user_id);

alter table public.skill_directory enable row level security;
alter table public.profile_skill_links enable row level security;

drop policy if exists "Skill directory is public" on public.skill_directory;
create policy "Skill directory is public"
on public.skill_directory for select using (true);

drop policy if exists "Profile skill links are public" on public.profile_skill_links;
create policy "Profile skill links are public"
on public.profile_skill_links for select using (true);

create or replace function public.normalize_skill_text(p_value text)
returns text
language plpgsql
immutable
set search_path = public
as $normalize$
begin
  return lower(trim(regexp_replace(coalesce(p_value,''),'[[:space:]]+',' ','g')));
end;
$normalize$;

revoke all on function public.normalize_skill_text(text) from public,anon,authenticated;
grant execute on function public.normalize_skill_text(text) to authenticated,service_role;

create or replace function public.sync_profile_skill_links()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_skill text;
  v_clean text;
  v_skill_id uuid;
begin
  delete from public.profile_skill_links where user_id=new.id;

  if new.skills is null then return new; end if;

  foreach v_skill in array new.skills loop
    v_clean:=trim(regexp_replace(coalesce(v_skill,''),'\s+',' ','g'));
    if char_length(v_clean) between 2 and 80 then
      insert into public.skill_directory(normalized_name,name,updated_at)
      values(public.normalize_skill_text(v_clean),v_clean,now())
      on conflict(normalized_name) do update set updated_at=now()
      returning id into v_skill_id;

      insert into public.profile_skill_links(user_id,skill_id)
      values(new.id,v_skill_id)
      on conflict do nothing;
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists profiles_sync_skill_directory on public.profiles;
drop trigger if exists profiles_sync_skill_links on public.profiles;
create trigger profiles_sync_skill_links
after insert or update of skills on public.profiles
for each row execute function public.sync_profile_skill_links();

insert into public.skill_directory(normalized_name,name)
select distinct public.normalize_skill_text(skill),trim(regexp_replace(skill,'\s+',' ','g'))
from public.profiles p
cross join lateral unnest(coalesce(p.skills,'{}'::text[])) as u(skill)
where char_length(trim(regexp_replace(skill,'\s+',' ','g'))) between 2 and 80
on conflict(normalized_name) do nothing;

insert into public.profile_skill_links(user_id,skill_id)
select p.id,d.id
from public.profiles p
cross join lateral unnest(coalesce(p.skills,'{}'::text[])) as u(skill)
join public.skill_directory d on d.normalized_name=public.normalize_skill_text(skill)
on conflict do nothing;

create or replace function public.get_skill_directory(p_search text default null,p_limit integer default 60)
returns table(id uuid,name text,member_count integer)
language sql
stable
security definer
set search_path=public
as $$
  select d.id,d.name,count(l.user_id)::integer
  from public.skill_directory d
  join public.profile_skill_links l on l.skill_id=d.id
  where nullif(trim(coalesce(p_search,'')),'') is null
     or d.normalized_name ilike '%'||public.normalize_skill_text(p_search)||'%'
  group by d.id,d.name
  order by count(l.user_id) desc,d.name asc
  limit greatest(1,least(coalesce(p_limit,60),100));
$$;

revoke all on function public.get_skill_directory(text,integer) from public;
grant execute on function public.get_skill_directory(text,integer) to anon,authenticated;

alter table public.opportunity_sources
  add column if not exists verified_source boolean not null default false,
  add column if not exists verified_at timestamptz null,
  add column if not exists verified_by uuid null references auth.users(id) on delete set null,
  add column if not exists verification_note text null;

create or replace function public.guard_opportunity_source_auto_publish()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_successes integer;
begin
  if new.auto_publish then
    if new.trust_tier not in ('official','partner') then
      raise exception 'Auto-publish is only available to official or direct partner sources';
    end if;
    if not new.verified_source then
      raise exception 'Verify this source before enabling auto-publish';
    end if;
    if new.requires_setup then
      raise exception 'Complete source setup before enabling auto-publish';
    end if;
    if new.endpoint_url !~* '^https://' then
      raise exception 'Auto-publish requires a secure HTTPS source';
    end if;

    select count(*)::integer into v_successes
    from public.opportunity_discovery_runs r
    where r.source_id=new.id and r.status='success';

    if coalesce(v_successes,0)<2 then
      raise exception 'A source needs at least two successful discovery runs before auto-publish';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists opportunity_sources_guard_auto_publish on public.opportunity_sources;
create trigger opportunity_sources_guard_auto_publish
before insert or update of auto_publish,verified_source,trust_tier,endpoint_url,requires_setup
on public.opportunity_sources
for each row execute function public.guard_opportunity_source_auto_publish();

create or replace function public.admin_verify_opportunity_source(p_source_id uuid,p_note text default null)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  s public.opportunity_sources%rowtype;
  v_successes integer;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;

  select * into s
  from public.opportunity_sources
  where id=p_source_id
  for update;

  if not found then raise exception 'Source not found'; end if;
  if s.trust_tier not in ('official','partner') then
    raise exception 'Only official or direct partner sources can be verified for auto-publish';
  end if;
  if s.endpoint_url !~* '^https://' then raise exception 'Source must use HTTPS'; end if;
  if s.requires_setup then raise exception 'Source setup is incomplete'; end if;
  if coalesce(s.consecutive_failures,0)>0 or s.last_error is not null then
    raise exception 'Resolve the current source error before verifying it';
  end if;

  select count(*)::integer into v_successes
  from public.opportunity_discovery_runs
  where source_id=s.id and status='success';

  if coalesce(v_successes,0)<2 then
    raise exception 'Source needs at least two successful discovery runs';
  end if;

  update public.opportunity_sources
  set verified_source=true,
      verified_at=now(),
      verified_by=auth.uid(),
      verification_note=nullif(left(trim(coalesce(p_note,'')),500),''),
      updated_at=now()
  where id=s.id;
end;
$$;

revoke all on function public.admin_verify_opportunity_source(uuid,text) from public,anon;
grant execute on function public.admin_verify_opportunity_source(uuid,text) to authenticated;

create or replace function public.admin_set_opportunity_source_auto_publish(p_source_id uuid,p_enabled boolean)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;

  update public.opportunity_sources
  set auto_publish=coalesce(p_enabled,false),updated_at=now()
  where id=p_source_id;

  if not found then raise exception 'Source not found'; end if;
end;
$$;

revoke all on function public.admin_set_opportunity_source_auto_publish(uuid,boolean) from public,anon;
grant execute on function public.admin_set_opportunity_source_auto_publish(uuid,boolean) to authenticated;

create or replace function public.service_publish_opportunity_candidate(p_candidate_id uuid)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  c public.opportunity_candidates%rowtype;
  s public.opportunity_sources%rowtype;
  v_category_id uuid;
  v_existing uuid;
  v_opportunity_id uuid;
begin
  select * into c
  from public.opportunity_candidates
  where id=p_candidate_id
  for update;

  if not found then raise exception 'Candidate not found'; end if;

  select * into s
  from public.opportunity_sources
  where id=c.source_id;

  if not s.auto_publish
     or not s.verified_source
     or s.trust_tier not in ('official','partner')
     or s.requires_setup
     or coalesce(s.consecutive_failures,0)>0
     or s.last_error is not null then
    raise exception 'Source is not allowed to auto-publish';
  end if;

  if c.status<>'pending' then raise exception 'Candidate is not pending'; end if;
  if c.canonical_url !~* '^https://' then raise exception 'Candidate requires a secure official link'; end if;
  if c.last_seen_at < now()-interval '6 hours' then raise exception 'Candidate is not fresh enough to auto-publish'; end if;
  if c.deadline is not null and c.deadline<now() then raise exception 'Expired candidate cannot be auto-published'; end if;
  if s.format='grants_gov' and c.deadline is null then
    raise exception 'Grants.gov item without a usable closing date requires review';
  end if;

  select id into v_existing
  from public.opportunities
  where link is not null and lower(link)=lower(c.canonical_url)
  order by created_at desc
  limit 1;

  if v_existing is not null then
    update public.opportunity_candidates
    set status='duplicate',
        duplicate_of_opportunity_id=v_existing,
        reviewed_at=now(),
        review_note='Automatically matched an existing POSSARA opportunity.'
    where id=c.id;
    return v_existing;
  end if;

  select id into v_category_id
  from public.opportunity_categories
  where slug=coalesce(c.category_slug,s.default_category_slug)
  limit 1;

  insert into public.opportunities(
    author_id,organization_id,category_id,title,description,eligibility,
    deadline,location,link,tags,status,source,last_verified_at,discovery_candidate_id
  ) values (
    null,null,v_category_id,c.title,
    coalesce(nullif(c.description,''),'Discovered from '||s.name||'. Visit the official source for full details.'),
    nullif(c.eligibility,''),c.deadline,coalesce(c.location,s.default_location),c.canonical_url,
    c.tags,'active','automated_discovery',now(),c.id
  ) returning id into v_opportunity_id;

  update public.opportunity_candidates
  set status='published',
      published_opportunity_id=v_opportunity_id,
      reviewed_at=now(),
      review_note='Auto-published from a verified source after freshness checks.'
  where id=c.id;

  return v_opportunity_id;
end;
$$;

revoke all on function public.service_publish_opportunity_candidate(uuid) from public,anon,authenticated;
grant execute on function public.service_publish_opportunity_candidate(uuid) to service_role;

-- First-party sources already proven by repeated successful runs.
update public.opportunity_sources s
set verified_source=true,
    verified_at=coalesce(s.verified_at,now()),
    verification_note=coalesce(s.verification_note,'POSSARA system-verified first-party source after repeated successful discovery runs.'),
    updated_at=now()
where (
    (s.name='Grants.gov' and s.endpoint_url like 'https://api.grants.gov/%')
    or (s.name='UN Careers' and s.endpoint_url like 'https://careers.un.org/%')
  )
  and s.trust_tier='official'
  and s.requires_setup=false
  and coalesce(s.consecutive_failures,0)=0
  and s.last_error is null
  and (select count(*) from public.opportunity_discovery_runs r where r.source_id=s.id and r.status='success')>=2;

update public.opportunity_sources s
set auto_publish=true,updated_at=now()
where s.verified_source=true
  and s.name in ('Grants.gov','UN Careers')
  and s.trust_tier='official'
  and s.requires_setup=false
  and coalesce(s.consecutive_failures,0)=0
  and s.last_error is null
  and (select count(*) from public.opportunity_discovery_runs r where r.source_id=s.id and r.status='success')>=2;
