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

  select * into c from public.opportunity_candidates where id=p_candidate_id for update;
  if not found then raise exception 'Candidate not found'; end if;
  if c.status not in ('pending','needs_review') then raise exception 'Candidate is not awaiting review'; end if;
  select * into s from public.opportunity_sources where id=c.source_id;

  v_category_id := p_category_id;
  if v_category_id is null then
    select id into v_category_id from public.opportunity_categories
    where slug=coalesce(c.category_slug,s.default_category_slug)
    limit 1;
  end if;

  if c.published_opportunity_id is not null then
    update public.opportunities
    set category_id=coalesce(v_category_id,category_id),
        title=c.title,
        description=coalesce(nullif(c.description,''),description),
        eligibility=nullif(c.eligibility,''),
        deadline=c.deadline,
        location=coalesce(c.location,s.default_location),
        link=c.canonical_url,
        tags=c.tags,
        status=case when c.deadline is not null and c.deadline < now() then 'closed' else 'active' end,
        last_verified_at=now(),
        updated_at=now()
    where id=c.published_opportunity_id
    returning id into v_opportunity_id;

    if v_opportunity_id is null then
      c.published_opportunity_id := null;
    else
      update public.opportunity_candidates
      set status=case when c.deadline is not null and c.deadline < now() then 'expired' else 'published' end,
          reviewed_by=auth.uid(), reviewed_at=now(), review_note='Source changes reviewed and approved by admin.'
      where id=c.id;
      return v_opportunity_id;
    end if;
  end if;

  select id into v_existing from public.opportunities
  where link is not null and lower(link)=lower(c.canonical_url)
  order by created_at desc limit 1;
  if v_existing is not null then
    update public.opportunity_candidates
    set status='duplicate', duplicate_of_opportunity_id=v_existing, reviewed_by=auth.uid(), reviewed_at=now(), review_note='Matched an existing POSSARA opportunity.'
    where id=c.id;
    return v_existing;
  end if;

  insert into public.opportunities(
    author_id, organization_id, category_id, title, description, eligibility,
    deadline, location, link, tags, status, source, last_verified_at, discovery_candidate_id
  ) values (
    null, null, v_category_id, c.title,
    coalesce(nullif(c.description,''), 'Discovered from ' || s.name || '. Visit the official source for full details.'),
    nullif(c.eligibility,''), c.deadline, coalesce(c.location,s.default_location), c.canonical_url,
    c.tags, case when c.deadline is not null and c.deadline < now() then 'closed' else 'active' end,
    'automated_discovery', now(), c.id
  ) returning id into v_opportunity_id;

  update public.opportunity_candidates
  set status=case when c.deadline is not null and c.deadline < now() then 'expired' else 'published' end,
      published_opportunity_id=v_opportunity_id, reviewed_by=auth.uid(), reviewed_at=now(), review_note='Approved and published by admin.'
  where id=c.id;

  return v_opportunity_id;
end;
$$;
revoke all on function public.admin_approve_opportunity_candidate(uuid,uuid) from public, anon;
grant execute on function public.admin_approve_opportunity_candidate(uuid,uuid) to authenticated;
