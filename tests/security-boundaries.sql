-- Live authorization regression checks. All temporary changes roll back.
begin;
select set_config('test.member',(select p.id::text from public.profiles p where not exists(select 1 from public.user_roles r where r.user_id=p.id and r.role in ('admin','moderator')) limit 1),true);
select set_config('test.other',(select id::text from public.profiles where id<>current_setting('test.member')::uuid limit 1),true);
do $$ declare f record; begin
 for f in select p.oid,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef loop
  if has_function_privilege('anon',f.oid,'execute') and f.proname not in ('get_public_profile','get_public_profile_by_username','get_public_member_stats') then raise exception 'Unexpected anonymous privileged API: %',f.proname; end if;
 end loop;
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity) then raise exception 'Public table missing RLS'; end if;
end $$;
-- Exercise birthday and presence privacy with a temporary profile setting.
update public.profiles set birthday_visibility='private',birthday_month=1,birthday_day=2 where id=current_setting('test.other')::uuid;
insert into public.user_preferences(user_id,show_online_status) values(current_setting('test.other')::uuid,false) on conflict(user_id) do update set show_online_status=false;
select set_config('request.jwt.claim.sub',current_setting('test.member'),true);
set local role authenticated;
do $$ declare j jsonb; changed int; begin
 if public.is_admin() or public.is_admin_or_mod() then raise exception 'Ordinary member escalated privileges'; end if;
 if public.get_my_profile()->>'id' <> current_setting('test.member') then raise exception 'Own-profile scope failed'; end if;
 j:=public.get_public_profile(current_setting('test.other')::uuid);
 if j->>'birthday_month' is not null or j->>'birthday_day' is not null or j ? 'email_verified_at' then raise exception 'Private profile field exposed'; end if;
 if exists(select 1 from public.get_social_status(current_setting('test.other')::uuid) where last_seen_at is not null) then raise exception 'Hidden presence exposed'; end if;
 begin if exists(select 1 from public.blocked_terms) then raise exception 'Internal moderation terms exposed'; end if; exception when insufficient_privilege then null; end;
 update public.user_roles set role='admin' where user_id=auth.uid();
 get diagnostics changed=row_count;
 if changed<>0 then raise exception 'Ordinary member can change roles'; end if;
 begin perform public.admin_reject_opportunity_candidate('00000000-0000-4000-8000-000000000000',null); raise exception 'Admin API accepted ordinary member'; exception when others then if sqlerrm <> 'Admin access required' then raise; end if; end;
 begin perform public.admin_set_opportunity_source_auto_publish('00000000-0000-4000-8000-000000000000',true); raise exception 'Admin API accepted ordinary member'; exception when others then if sqlerrm <> 'Admin access required' then raise; end if; end;
 if exists(select 1 from public.job_postings job cross join lateral public.get_recruiter_job_cbt_questions(job.id) q where not exists(select 1 from public.organization_members m where m.organization_id=job.organization_id and m.user_id=auth.uid() and m.role in ('owner','recruiter'))) then raise exception 'Outsider can read answer keys'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$ declare j jsonb; begin
 j:=public.get_public_profile(current_setting('test.other')::uuid);
 if j->>'birthday_month' is not null or j->>'birthday_day' is not null then raise exception 'Anonymous birthday privacy failed'; end if;
 begin perform public.get_my_profile(); raise exception 'Anonymous private API accessible'; exception when insufficient_privilege then null; end;
end $$;
select 'PASS: privileged grants, RLS, profile privacy, hidden presence, role escalation, admin access and anonymous API scope' result;
rollback;
