alter table public.story_interactions add column if not exists reaction_type text not null default 'love'
check(reaction_type in ('like','love','care','haha','wow','sad'));
revoke update on public.story_interactions from public,anon,authenticated;
grant update(reaction_type) on public.story_interactions to authenticated;
create policy "Members change own story reactions" on public.story_interactions for update to authenticated
using(user_id=(select auth.uid()) and kind='like')
with check(user_id=(select auth.uid()) and kind='like' and exists(select 1 from public.stories s where s.id=story_id));

alter table public.job_cbt_attempts add column if not exists draft_answers jsonb not null default '{}'::jsonb check(jsonb_typeof(draft_answers)='object');
revoke update on public.job_cbt_attempts from public,anon,authenticated;
grant update(draft_answers) on public.job_cbt_attempts to authenticated;
create policy "Applicants save answers before exam deadline" on public.job_cbt_attempts for update to authenticated
using(submitted_at is null and now()<started_at+make_interval(secs=>time_limit_seconds)
 and exists(select 1 from public.job_applications a where a.id=application_id and a.applicant_id=(select auth.uid()) and not a.needs_reapply))
with check(submitted_at is null and now()<started_at+make_interval(secs=>time_limit_seconds)
 and exists(select 1 from public.job_applications a where a.id=application_id and a.applicant_id=(select auth.uid()) and not a.needs_reapply));

create or replace function public.save_job_cbt_draft(p_application_id uuid,p_answers jsonb)
returns void language plpgsql security invoker set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 if jsonb_typeof(p_answers) is distinct from 'object' or octet_length(p_answers::text)>100000 then raise exception 'Invalid exam answers'; end if;
 update public.job_cbt_attempts set draft_answers=p_answers where application_id=p_application_id;
 if not found then raise exception 'This assessment is unavailable, submitted or its time has elapsed'; end if;
end $$;
revoke all on function public.save_job_cbt_draft(uuid,jsonb) from public,anon;
grant execute on function public.save_job_cbt_draft(uuid,jsonb) to authenticated;

create or replace function public.start_job_cbt(p_application_id uuid)
returns table(started_at timestamptz,time_limit_seconds integer)
language plpgsql security definer set search_path=public as $$
declare v_job uuid;v_limit int;v_attempt public.job_cbt_attempts%rowtype;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 select a.job_posting_id,j.cbt_time_limit_seconds into v_job,v_limit
 from public.job_applications a join public.job_postings j on j.id=a.job_posting_id
 where a.id=p_application_id and a.applicant_id=auth.uid() and not a.needs_reapply and j.requires_cbt for update of j;
 if v_job is null then raise exception 'Application unavailable or CBT is not required'; end if;
 if not exists(select 1 from public.job_cbt_questions where job_posting_id=v_job) then raise exception 'Assessment is not ready'; end if;
 insert into public.job_cbt_attempts(application_id,started_at,time_limit_seconds)
 values(p_application_id,now(),coalesce(v_limit,900)) on conflict(application_id) do nothing;
 select * into v_attempt from public.job_cbt_attempts where application_id=p_application_id for update;
 if v_attempt.submitted_at is not null then raise exception 'Assessment has already been submitted'; end if;
 return query select v_attempt.started_at,v_attempt.time_limit_seconds;
end $$;
revoke all on function public.start_job_cbt(uuid) from public,anon;
grant execute on function public.start_job_cbt(uuid) to authenticated;

create or replace function public.submit_job_cbt(p_application_id uuid,p_answers jsonb)
returns integer language plpgsql security definer set search_path=public as $$
declare v_job uuid;v_total int;v_correct int;v_score int;v_attempt public.job_cbt_attempts%rowtype;v_answers jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 select job_posting_id into v_job from public.job_applications where id=p_application_id and applicant_id=auth.uid() and not needs_reapply;
 if v_job is null then raise exception 'Application not found or needs updating'; end if;
 select * into v_attempt from public.job_cbt_attempts where application_id=p_application_id for update;
 if v_attempt.id is null then raise exception 'Assessment has not been started'; end if;
 if v_attempt.submitted_at is not null then return v_attempt.score; end if;
 v_answers:=case when now()>=v_attempt.started_at+make_interval(secs=>v_attempt.time_limit_seconds) then v_attempt.draft_answers else coalesce(p_answers,'{}'::jsonb) end;
 if jsonb_typeof(v_answers)<>'object' then raise exception 'Invalid answers'; end if;
 select count(*),count(*) filter(where v_answers->>q.id::text=q.correct_choice) into v_total,v_correct from public.job_cbt_questions q where q.job_posting_id=v_job;
 if v_total=0 then raise exception 'Assessment has no questions'; end if;
 v_score:=round((v_correct::numeric/v_total::numeric)*100);
 update public.job_cbt_attempts set submitted_at=now(),score=v_score,draft_answers=v_answers where id=v_attempt.id;
 insert into public.job_cbt_answers(attempt_id,question_id,selected_choice)
 select v_attempt.id,q.id,v_answers->>q.id::text from public.job_cbt_questions q where q.job_posting_id=v_job and v_answers ? q.id::text;
 return v_score;
end $$;
revoke all on function public.submit_job_cbt(uuid,jsonb) from public,anon;
grant execute on function public.submit_job_cbt(uuid,jsonb) to authenticated;

create or replace function public.prevent_started_exam_changes()
returns trigger language plpgsql security invoker set search_path=public as $$
declare v_job uuid;
begin
 v_job:=case when tg_op='DELETE' then old.job_posting_id else new.job_posting_id end;
 perform 1 from public.job_postings where id=v_job for update;
 if found and exists(select 1 from public.job_cbt_attempts t join public.job_applications a on a.id=t.application_id where a.job_posting_id=v_job) then
   raise exception 'Applicants have already started this assessment. Create a new role for a different exam.';
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
create trigger protect_started_exam before insert or update or delete on public.job_cbt_questions for each row execute function public.prevent_started_exam_changes();
