create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

alter table public.opportunities drop constraint if exists opportunities_source_check;
alter table public.opportunities
  add constraint opportunities_source_check
  check (source = any (array['user_submitted'::text,'ai_suggested'::text,'partner_direct'::text,'automated_discovery'::text]));

create table if not exists public.opportunity_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  endpoint_url text not null,
  format text not null check (format in ('rss','atom','json_feed','json_api','grants_gov','reliefweb')),
  enabled boolean not null default true,
  trust_tier text not null default 'trusted_aggregator' check (trust_tier in ('official','partner','trusted_aggregator')),
  default_category_slug text null,
  default_location text null,
  default_organization_name text null,
  check_every_minutes integer not null default 240 check (check_every_minutes between 30 and 10080),
  adapter jsonb not null default '{}'::jsonb,
  auto_publish boolean not null default false,
  requires_setup boolean not null default false,
  setup_note text null,
  last_checked_at timestamptz null,
  last_success_at timestamptz null,
  last_error text null,
  consecutive_failures integer not null default 0,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.opportunity_discovery_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid null references public.opportunity_sources(id) on delete set null,
  mode text not null default 'discover' check (mode in ('discover','recheck')),
  status text not null default 'running' check (status in ('running','success','partial','failed')),
  fetched_count integer not null default 0,
  new_count integer not null default 0,
  updated_count integer not null default 0,
  duplicate_count integer not null default 0,
  error_message text null,
  started_at timestamptz not null default now(),
  finished_at timestamptz null
);

create table if not exists public.opportunity_candidates (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.opportunity_sources(id) on delete cascade,
  external_id text not null,
  canonical_url text not null,
  title text not null,
  description text null,
  eligibility text null,
  deadline timestamptz null,
  location text null,
  organization_name text null,
  category_slug text null,
  tags text[] not null default '{}'::text[],
  content_hash text not null,
  raw_payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','needs_review','published','rejected','duplicate','expired')),
  review_note text null,
  published_opportunity_id uuid null references public.opportunities(id) on delete set null,
  duplicate_of_opportunity_id uuid null references public.opportunities(id) on delete set null,
  link_http_status integer null,
  consecutive_link_failures integer not null default 0,
  last_link_checked_at timestamptz null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  reviewed_by uuid null references auth.users(id) on delete set null,
  reviewed_at timestamptz null,
  unique (source_id, external_id)
);

alter table public.opportunities add column if not exists discovery_candidate_id uuid null references public.opportunity_candidates(id) on delete set null;
create unique index if not exists opportunities_discovery_candidate_uidx on public.opportunities(discovery_candidate_id) where discovery_candidate_id is not null;
create index if not exists opportunity_candidates_status_seen_idx on public.opportunity_candidates(status, last_seen_at desc);
create index if not exists opportunity_candidates_source_status_idx on public.opportunity_candidates(source_id, status, last_seen_at desc);
create index if not exists opportunity_sources_enabled_due_idx on public.opportunity_sources(enabled, last_checked_at);
create index if not exists opportunity_discovery_runs_started_idx on public.opportunity_discovery_runs(started_at desc);

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.opportunity_discovery_config (
  singleton boolean primary key default true check (singleton = true),
  cron_secret text not null,
  max_sources_per_run integer not null default 12 check (max_sources_per_run between 1 and 50),
  max_items_per_source integer not null default 80 check (max_items_per_source between 5 and 200),
  updated_at timestamptz not null default now()
);

insert into private.opportunity_discovery_config(singleton, cron_secret)
values (true, replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (singleton) do nothing;

alter table public.opportunity_sources enable row level security;
alter table public.opportunity_candidates enable row level security;
alter table public.opportunity_discovery_runs enable row level security;

drop policy if exists "Admins manage opportunity sources" on public.opportunity_sources;
create policy "Admins manage opportunity sources" on public.opportunity_sources for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage opportunity candidates" on public.opportunity_candidates;
create policy "Admins manage opportunity candidates" on public.opportunity_candidates for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins read discovery runs" on public.opportunity_discovery_runs;
create policy "Admins read discovery runs" on public.opportunity_discovery_runs for select using (public.is_admin());

create or replace function public.get_opportunity_discovery_cron_secret()
returns text
language sql
security definer
set search_path = private, public
as $$
  select cron_secret from private.opportunity_discovery_config where singleton = true;
$$;
revoke all on function public.get_opportunity_discovery_cron_secret() from public, anon, authenticated;
grant execute on function public.get_opportunity_discovery_cron_secret() to service_role;

create or replace function public.admin_approve_opportunity_candidate(p_candidate_id uuid, p_category_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.opportunity_candidates%rowtype;
  s public.opportunity_sources%rowtype;
  v_category_id uuid;
  v_existing uuid;
  v_opportunity_id uuid;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  select * into c from public.opportunity_candidates where id = p_candidate_id for update;
  if not found then raise exception 'Candidate not found'; end if;
  if c.status not in ('pending','needs_review') then raise exception 'Candidate is not awaiting review'; end if;
  select * into s from public.opportunity_sources where id = c.source_id;

  select id into v_existing from public.opportunities
  where link is not null and lower(link) = lower(c.canonical_url)
  order by created_at desc limit 1;
  if v_existing is not null then
    update public.opportunity_candidates
      set status='duplicate', duplicate_of_opportunity_id=v_existing, reviewed_by=auth.uid(), reviewed_at=now(), review_note='Matched an existing POSSARA opportunity.'
      where id=c.id;
    return v_existing;
  end if;

  v_category_id := p_category_id;
  if v_category_id is null then
    select id into v_category_id from public.opportunity_categories
    where slug = coalesce(c.category_slug, s.default_category_slug)
    limit 1;
  end if;

  insert into public.opportunities(
    author_id, organization_id, category_id, title, description, eligibility,
    deadline, location, link, tags, status, source, last_verified_at, discovery_candidate_id
  ) values (
    null, null, v_category_id, c.title,
    coalesce(nullif(c.description,''), 'Discovered from ' || s.name || '. Visit the official source for full details.'),
    nullif(c.eligibility,''), c.deadline, coalesce(c.location,s.default_location), c.canonical_url,
    c.tags, 'active', 'automated_discovery', now(), c.id
  ) returning id into v_opportunity_id;

  update public.opportunity_candidates
    set status='published', published_opportunity_id=v_opportunity_id, reviewed_by=auth.uid(), reviewed_at=now(), review_note='Approved and published by admin.'
    where id=c.id;
  return v_opportunity_id;
end;
$$;
revoke all on function public.admin_approve_opportunity_candidate(uuid,uuid) from public, anon;
grant execute on function public.admin_approve_opportunity_candidate(uuid,uuid) to authenticated;

create or replace function public.admin_reject_opportunity_candidate(p_candidate_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  update public.opportunity_candidates
  set status='rejected', review_note=nullif(left(coalesce(p_reason,''),500),''), reviewed_by=auth.uid(), reviewed_at=now()
  where id=p_candidate_id and status in ('pending','needs_review');
  if not found then raise exception 'Candidate is not awaiting review'; end if;
end;
$$;
revoke all on function public.admin_reject_opportunity_candidate(uuid,text) from public, anon;
grant execute on function public.admin_reject_opportunity_candidate(uuid,text) to authenticated;

create or replace function public.close_expired_discovered_opportunities()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.opportunities
  set status='closed', updated_at=now()
  where source='automated_discovery' and status='active' and deadline is not null and deadline < now();
  get diagnostics affected = row_count;

  update public.opportunity_candidates c
  set status='expired', last_seen_at=greatest(last_seen_at, now())
  where c.published_opportunity_id in (
    select o.id from public.opportunities o where o.source='automated_discovery' and o.status='closed' and o.deadline is not null and o.deadline < now()
  ) and c.status='published';
  return affected;
end;
$$;
revoke all on function public.close_expired_discovered_opportunities() from public, anon, authenticated;
grant execute on function public.close_expired_discovered_opportunities() to service_role;

insert into public.opportunity_sources(
  name, endpoint_url, format, enabled, trust_tier, default_category_slug, default_location,
  default_organization_name, check_every_minutes, adapter, auto_publish, requires_setup
) values (
  'Grants.gov', 'https://api.grants.gov/v1/api/search2', 'grants_gov', true, 'official', 'grants', 'United States',
  'Grants.gov', 240,
  '{"rows":40,"oppStatuses":"forecasted|posted","detailEndpoint":"https://api.grants.gov/v1/api/fetchOpportunity"}'::jsonb,
  false, false
) on conflict (name) do nothing;

insert into public.opportunity_sources(
  name, endpoint_url, format, enabled, trust_tier, default_category_slug,
  default_organization_name, check_every_minutes, adapter, auto_publish, requires_setup
) values (
  'UN Careers', 'https://careers.un.org/jobfeed?isPage=true&language=en', 'rss', true, 'official', 'jobs',
  'United Nations', 240, '{}'::jsonb, false, false
) on conflict (name) do nothing;

select cron.schedule(
  'possara-opportunity-discovery-4h',
  '17 */4 * * *',
  $job$
  select net.http_post(
    url := 'https://qetadbstyojabagixrjp.supabase.co/functions/v1/opportunity-discovery',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-possara-discovery-secret',(select cron_secret from private.opportunity_discovery_config where singleton=true)
    ),
    body := jsonb_build_object('mode','discover','scheduled',true),
    timeout_milliseconds := 25000
  );
  $job$
);

select cron.schedule(
  'possara-opportunity-recheck-daily',
  '35 2 * * *',
  $job$
  select net.http_post(
    url := 'https://qetadbstyojabagixrjp.supabase.co/functions/v1/opportunity-discovery',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-possara-discovery-secret',(select cron_secret from private.opportunity_discovery_config where singleton=true)
    ),
    body := jsonb_build_object('mode','recheck','scheduled',true),
    timeout_milliseconds := 25000
  );
  $job$
);

select cron.schedule(
  'possara-close-expired-opportunities-daily',
  '10 1 * * *',
  $$ select public.close_expired_discovered_opportunities(); $$
);
