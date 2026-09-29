alter table public.community_groups add column organization_id uuid references public.organizations(id) on delete set null;
create index community_groups_organization_idx on public.community_groups(organization_id);
create table public.community_opportunities(
 id uuid primary key default gen_random_uuid(), group_id uuid not null references public.community_groups(id) on delete cascade,
 shared_by uuid not null references public.profiles(id), opportunity_id uuid references public.opportunities(id) on delete cascade,
 job_id uuid references public.job_postings(id) on delete cascade, note text not null default '' check(length(note)<=1000),
 created_at timestamptz not null default now(),check(num_nonnulls(opportunity_id,job_id)=1)
);
create unique index community_opportunity_once on public.community_opportunities(group_id,opportunity_id) where opportunity_id is not null;
create unique index community_job_once on public.community_opportunities(group_id,job_id) where job_id is not null;
create index community_opportunity_target_idx on public.community_opportunities(opportunity_id);
create index community_job_target_idx on public.community_opportunities(job_id);
create index community_opportunity_author_idx on public.community_opportunities(shared_by);
alter table public.community_opportunities enable row level security;
revoke all on public.community_opportunities from public,anon,authenticated;
grant select on public.community_opportunities to authenticated;
create policy community_opportunities_read on public.community_opportunities for select to authenticated using(private.community_member(group_id));
create trigger community_opportunities_verified before insert or update on public.community_opportunities for each row execute function public.require_verified_member_write();

-- Keep the tested group actions intact and add atomic organization creation and sharing.
create function private.community_dispatch(action text,gid uuid,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); org uuid; result jsonb; target uuid; row_id uuid;
begin
 if uid is null then raise exception 'Sign in to use groups.';end if;
 if action='create' and nullif(payload->>'organization_id','') is not null then
  org:=(payload->>'organization_id')::uuid;
  if not exists(select 1 from public.organizations o where o.id=org and (o.owner_id=uid or exists(select 1 from public.organization_members m where m.organization_id=o.id and m.user_id=uid and m.role='recruiter'))) then raise exception 'Only an organization manager can create its official group.';end if;
  result:=private.community_action(action,gid,payload);
  update public.community_groups set organization_id=org where id=(result->>'id')::uuid and owner_id=uid;
  return result;
 elsif action in ('share_opportunity','remove_opportunity') then
  if not private.community_member(gid) then raise exception 'Active membership required.';end if;
  if action='remove_opportunity' then
   delete from public.community_opportunities where id=(payload->>'id')::uuid and group_id=gid and (shared_by=uid or private.community_member(gid,true)) returning id into row_id;
   if row_id is null then raise exception 'You cannot remove this shared opportunity.';end if;
  else
   target:=(payload->>'target_id')::uuid;
   if payload->>'kind'='job' then
    if not exists(select 1 from public.job_postings where id=target and status='open' and (closes_at is null or closes_at>now())) then raise exception 'This job is no longer open.';end if;
    insert into public.community_opportunities(group_id,shared_by,job_id,note) values(gid,uid,target,coalesce(payload->>'note','')) on conflict do nothing returning id into row_id;
   elsif payload->>'kind'='opportunity' then
    if not exists(select 1 from public.opportunities where id=target and status='active' and (deadline is null or deadline>now())) then raise exception 'This opportunity is no longer open.';end if;
    insert into public.community_opportunities(group_id,shared_by,opportunity_id,note) values(gid,uid,target,coalesce(payload->>'note','')) on conflict do nothing returning id into row_id;
   else raise exception 'Choose a job or opportunity.';end if;
   if row_id is null then raise exception 'This opportunity is already shared in the group.';end if;
  end if;
  return jsonb_build_object('id',row_id);
 end if;
 return private.community_action(action,gid,payload);
end $$;
revoke all on function private.community_dispatch(text,uuid,jsonb) from public,anon;
grant execute on function private.community_dispatch(text,uuid,jsonb) to authenticated;
create or replace function public.community_action(action text,gid uuid default null,payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private.community_dispatch(action,gid,payload)$$;

-- Public search must not evaluate a staff-only permission helper for visitors.
alter policy "Active and closed opportunities are viewable by everyone" on public.opportunities to authenticated;
create policy "Visitors read published opportunity listings" on public.opportunities for select to anon using(status in ('active','closed'));
