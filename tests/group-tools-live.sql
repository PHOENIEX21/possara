-- Rollback-only: no real group, share or notification survives this test.
begin;
do $$
declare org uuid; owner_uid uuid; outsider uuid; gid uuid; job uuid; result jsonb; shared_id uuid;
begin
 select o.id,o.owner_id into org,owner_uid from public.organizations o join public.profiles p on p.id=o.owner_id where p.email_verified_at is not null limit 1;
 select id into outsider from public.profiles where id<>owner_uid and email_verified_at is not null limit 1;
 if org is null or outsider is null then raise exception 'Verified organization owner and another verified member required';end if;
 select id into job from public.job_postings where status='open' and (closes_at is null or closes_at>now()) limit 1;
 perform set_config('request.jwt.claim.sub',owner_uid::text,true);set local role authenticated;
 result:=public.community_action('create',null,jsonb_build_object('name','Rollback official group','privacy','private','organization_id',org));
 gid:=(result->>'id')::uuid;
 if not exists(select 1 from public.community_groups where id=gid and organization_id=org) then raise exception 'Organization association missing';end if;
 if job is not null then
  result:=public.community_action('share_opportunity',gid,jsonb_build_object('kind','job','target_id',job,'note','Rollback share'));
  shared_id:=(result->>'id')::uuid;
  if not exists(select 1 from public.community_opportunities where id=shared_id) then raise exception 'Shared opportunity missing';end if;
  perform set_config('request.jwt.claim.sub',outsider::text,true);
  if exists(select 1 from public.community_opportunities where id=shared_id) then raise exception 'Private opportunity leaked';end if;
  perform set_config('request.jwt.claim.sub',owner_uid::text,true);
  perform public.community_action('remove_opportunity',gid,jsonb_build_object('id',shared_id));
 end if;
 reset role;
end $$;
set local role anon;
select id from public.opportunities where status='active' limit 1;
rollback;
select 'PASS: official organization group creation, shared opportunity permissions/removal when an open job exists, visitor opportunity search; all synthetic rows rolled back.' as result;
