-- Exercises the real database as employer/applicant roles. Everything rolls back.
begin;
select set_config('test.org',(select o.id::text from public.organizations o join public.organization_members m on m.organization_id=o.id and m.user_id=o.owner_id where m.role='owner' limit 1),true);
select set_config('test.owner',(select owner_id::text from public.organizations where id=current_setting('test.org')::uuid),true);
select set_config('test.applicant',(select p.id::text from public.profiles p where p.id<>current_setting('test.owner')::uuid and not exists(select 1 from public.organization_members m where m.organization_id=current_setting('test.org')::uuid and m.user_id=p.id) limit 1),true);
select set_config('request.jwt.claim.sub',current_setting('test.owner'),true);
set local role authenticated;
with job as (
 insert into public.job_postings(organization_id,title,role_type,rank,employment_type,work_style,location,description,posted_by,status,application_document_required,requires_cbt)
 values(current_setting('test.org')::uuid,'Verification role - rolled back','Testing','Entry','Full-time','Remote','Lagos','Verification only',auth.uid(),'draft',false,true) returning id
) select set_config('test.job',id::text,true) from job;
insert into public.screening_questions(job_posting_id,question_text,answer_type,required,sort_order) values(current_setting('test.job')::uuid,'Available?','yes_no',true,0);
select public.save_job_cbt_questions(current_setting('test.job')::uuid,'[{"questionText":"First question","choices":["A","B"],"correctChoice":"A"},{"questionText":"Second question","choices":["A","B"],"correctChoice":"B"}]',120);
update public.job_postings set status='open' where id=current_setting('test.job')::uuid;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.applicant'),true);
set local role authenticated;
select set_config('test.application',public.submit_job_application(current_setting('test.job')::uuid,'','',
 (select jsonb_agg(jsonb_build_object('questionId',id,'value','Yes')) from public.screening_questions where job_posting_id=current_setting('test.job')::uuid),null,'{}'::text[])::text,true);
do $$ begin
 begin if exists(select 1 from public.job_cbt_questions where job_posting_id=current_setting('test.job')::uuid) then raise exception 'Applicant can read answer keys'; end if; exception when insufficient_privilege then null; end;
 if exists(select 1 from public.get_job_cbt_questions(current_setting('test.job')::uuid) q where to_jsonb(q)?'correct_choice') then raise exception 'Answer key leaked through RPC'; end if;
end $$;
select * from public.start_job_cbt(current_setting('test.application')::uuid);
select set_config('test.started',(select started_at::text from public.job_cbt_attempts where application_id=current_setting('test.application')::uuid),true);
select * from public.start_job_cbt(current_setting('test.application')::uuid);
do $$ begin
 if (select started_at::text from public.job_cbt_attempts where application_id=current_setting('test.application')::uuid)<>current_setting('test.started') then raise exception 'Restart reset timer'; end if;
end $$;
select set_config('test.answers',(select jsonb_object_agg(q.id::text,'A')::text from public.get_job_cbt_questions(current_setting('test.job')::uuid) q),true);
select public.save_job_cbt_draft(current_setting('test.application')::uuid,current_setting('test.answers')::jsonb);
do $$ begin
 if (select draft_answers from public.job_cbt_attempts where application_id=current_setting('test.application')::uuid)<>current_setting('test.answers')::jsonb then raise exception 'Answer draft not restored'; end if;
 begin update public.job_cbt_attempts set score=100 where application_id=current_setting('test.application')::uuid; raise exception 'Applicant changed score'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.owner'),true);
set local role authenticated;
do $$ begin
 begin perform public.save_job_cbt_questions(current_setting('test.job')::uuid,'[{"questionText":"Changed","choices":["A","B"],"correctChoice":"B"}]',120);
 raise exception 'Started exam was changed';
 exception when others then if sqlerrm not like 'Applicants have already started%' then raise; end if; end;
end $$;
reset role;
update public.job_cbt_attempts set started_at=now()-interval '5 minutes' where application_id=current_setting('test.application')::uuid;
select set_config('request.jwt.claim.sub',current_setting('test.applicant'),true);
set local role authenticated;
do $$ declare result integer; begin
 begin perform public.save_job_cbt_draft(current_setting('test.application')::uuid,'{}');raise exception 'Expired answer edit allowed';exception when others then if sqlerrm not like 'This assessment is unavailable%' then raise; end if;end;
 result:=public.submit_job_cbt(current_setting('test.application')::uuid,'{}');
 if result<>50 then raise exception 'Expected score 50 from saved answers; got %',result; end if;
 if public.submit_job_cbt(current_setting('test.application')::uuid,'{}')<>50 then raise exception 'Retry changed score'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.owner'),true);
set local role authenticated;
do $$ begin
 if not exists(select 1 from public.job_cbt_attempts where application_id=current_setting('test.application')::uuid and score=50 and submitted_at is not null) then raise exception 'Employer cannot see result'; end if;
end $$;
select 'PASS: job, screening, application, answer-key privacy, exam start/resume, draft save, deadline, immutable questions, scoring, retry, employer result' as result;
rollback;
