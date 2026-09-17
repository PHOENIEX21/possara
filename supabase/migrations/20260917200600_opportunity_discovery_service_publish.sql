create or replace function public.service_publish_opportunity_candidate(p_candidate_id uuid)
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
  select * into c from public.opportunity_candidates where id=p_candidate_id for update;
  if not found then raise exception 'Candidate not found'; end if;
  select * into s from public.opportunity_sources where id=c.source_id;
  if not s.auto_publish or s.trust_tier not in ('official','partner') then
    raise exception 'Source is not allowed to auto-publish';
  end if;
  if c.status <> 'pending' then raise exception 'Candidate is not pending'; end if;

  select id into v_existing from public.opportunities
  where link is not null and lower(link)=lower(c.canonical_url)
  order by created_at desc limit 1;
  if v_existing is not null then
    update public.opportunity_candidates
    set status='duplicate', duplicate_of_opportunity_id=v_existing, reviewed_at=now(), review_note='Automatically matched an existing POSSARA opportunity.'
    where id=c.id;
    return v_existing;
  end if;

  select id into v_category_id from public.opportunity_categories
  where slug=coalesce(c.category_slug,s.default_category_slug)
  limit 1;

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
  set status='published', published_opportunity_id=v_opportunity_id, reviewed_at=now(), review_note='Auto-published from an explicitly trusted source.'
  where id=c.id;
  return v_opportunity_id;
end;
$$;
revoke all on function public.service_publish_opportunity_candidate(uuid) from public, anon, authenticated;
grant execute on function public.service_publish_opportunity_candidate(uuid) to service_role;
