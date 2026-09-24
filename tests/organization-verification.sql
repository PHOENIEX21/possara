-- Synthetic organizations only; all records are rolled back.
begin;
select set_config('test.admin',(select user_id::text from public.user_roles where role='admin' and is_verified and not is_banned limit 1),true);
select set_config('test.member',(select p.id::text from public.profiles p where not exists(select 1 from public.user_roles r where r.user_id=p.id and r.role='admin') limit 1),true);
select set_config('test.org',gen_random_uuid()::text,true);
select set_config('request.jwt.claim.sub',current_setting('test.member'),true);
set local role authenticated;
insert into public.organizations(id,owner_id,name,slug,verified,verification_status)
values(current_setting('test.org')::uuid,auth.uid(),'Verification regression fixture','verification-fixture-'||current_setting('test.org'),false,'pending');
do $$ begin
  begin
    update public.organizations set verified=true,verification_status='verified' where id=current_setting('test.org')::uuid;
    raise exception 'Owner was allowed to self-verify';
  exception when others then
    if sqlerrm not like 'Only POSSARA administrators%' then raise; end if;
  end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.admin'),true);
set local role authenticated;
do $$ begin
  if not public.is_admin() then raise exception 'No eligible admin fixture'; end if;
  update public.organizations set verified=true,verification_status='verified' where id=current_setting('test.org')::uuid;
  if not found then raise exception 'Admin verification updated no row'; end if;
  if not exists(select 1 from public.organizations where id=current_setting('test.org')::uuid and verified and verification_status='verified') then raise exception 'Verification state did not persist'; end if;
end $$;
select 'PASS: owner cannot self-verify; admin approval sets both badge fields' as result;
rollback;
