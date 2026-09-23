-- All test data and notification rows are rolled back.
begin;
select set_config('test.org',(select o.id::text from public.organizations o join public.organization_members m on m.organization_id=o.id and m.user_id=o.owner_id where m.role='owner' limit 1),true);
select set_config('test.owner',(select owner_id::text from public.organizations where id=current_setting('test.org')::uuid),true);
select set_config('test.outsider',(select id::text from public.profiles p where not exists(select 1 from public.organization_members m where m.organization_id=current_setting('test.org')::uuid and m.user_id=p.id) and id<>current_setting('test.owner')::uuid limit 1),true);
select set_config('test.job',gen_random_uuid()::text,true);
select set_config('test.payload',jsonb_build_object('organization_id',current_setting('test.org'),'title','Atomic verification','role_type','Testing','location','Lagos','description','Verification only','status','open','application_document_required',false)::text,true);
select set_config('request.jwt.claim.sub',current_setting('test.owner'),true);
set local role authenticated;
do $$ declare result jsonb; begin
  begin
    perform public.create_job_with_screening(current_setting('test.job')::uuid,current_setting('test.payload')::jsonb,'[{"questionText":"Broken choices","answerType":"single_choice","choices":["A","a"]}]');
    raise exception 'Invalid choices were accepted';
  exception when others then
    if sqlerrm not like 'Add at least two distinct%' then raise; end if;
  end;
  if exists(select 1 from public.job_postings where id=current_setting('test.job')::uuid) then raise exception 'Partial job persisted after screening failure'; end if;
  result:=public.create_job_with_screening(current_setting('test.job')::uuid,current_setting('test.payload')::jsonb,'[{"questionText":"Available?","answerType":"yes_no","required":true}]');
  if result->>'id'<>current_setting('test.job') then raise exception 'Wrong job ID'; end if;
  perform public.create_job_with_screening(current_setting('test.job')::uuid,current_setting('test.payload')::jsonb,'[{"questionText":"Available?","answerType":"yes_no","required":true}]');
  if (select count(*) from public.screening_questions where job_posting_id=current_setting('test.job')::uuid)<>1 then raise exception 'Retry duplicated screening questions'; end if;
  if (select posted_by::text from public.job_postings where id=current_setting('test.job')::uuid)<>current_setting('test.owner') then raise exception 'Incorrect author'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.outsider'),true);
set local role authenticated;
do $$ begin
  begin
    perform public.create_job_with_screening(gen_random_uuid(),current_setting('test.payload')::jsonb,'[]');
    raise exception 'Outsider created an organization job';
  exception when insufficient_privilege then null;
  end;
end $$;
select 'PASS: atomic rollback, successful job and screening, retry deduplication, original authorship, unauthorized rejection' as result;
rollback;
