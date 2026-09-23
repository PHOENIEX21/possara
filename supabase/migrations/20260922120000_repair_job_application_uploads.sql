-- Keep application uploads aligned with the formats and fields exposed by the client.
alter table public.job_applications
  add column if not exists document_urls jsonb not null default '[]'::jsonb;

update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/webp'
    ]
where id = 'job-documents';

drop policy if exists "Recruiters read applicant job documents" on storage.objects;
create policy "Recruiters read applicant job documents"
on storage.objects for select to authenticated
using (
  bucket_id = 'job-documents'
  and exists (
    select 1
    from public.job_applications a
    join public.job_postings j on j.id = a.job_posting_id
    join public.organization_members om on om.organization_id = j.organization_id
    where om.user_id = (select auth.uid())
      and om.role in ('owner', 'recruiter')
      and (
        a.cv_url = name
        or a.photo_url = name
        or a.document_urls @> jsonb_build_array(name)
      )
  )
);

drop function if exists public.submit_job_application(uuid, text, text, jsonb, text, jsonb);

create or replace function public.submit_job_application(
  p_job_id uuid,
  p_cv_url text,
  p_cover_letter text,
  p_answers jsonb,
  p_photo_url text default null,
  p_document_urls jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_item jsonb;
  v_job public.job_postings%rowtype;
  v_existing public.job_applications%rowtype;
  v_documents jsonb := case when jsonb_typeof(coalesce(p_document_urls, '[]'::jsonb)) = 'array' then coalesce(p_document_urls, '[]'::jsonb) else '[]'::jsonb end;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;

  select * into v_job from public.job_postings j
  where j.id = p_job_id and j.status = 'open' and (j.closes_at is null or j.closes_at >= now());
  if v_job.id is null then raise exception 'This role is not accepting applications'; end if;
  if v_job.application_document_required and nullif(trim(coalesce(p_cv_url, '')), '') is null then raise exception 'Required application document is missing'; end if;
  if v_job.passport_photo_required and nullif(trim(coalesce(p_photo_url, '')), '') is null then raise exception 'Passport photo is required'; end if;
  if v_job.cover_letter_required and nullif(trim(coalesce(p_cover_letter, '')), '') is null then raise exception 'Cover letter is required'; end if;

  if exists (
    select 1 from public.screening_questions q
    where q.job_posting_id = p_job_id and q.required
      and not exists (
        select 1 from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb)) item
        where item->>'questionId' = q.id::text and nullif(trim(coalesce(item->>'value', '')), '') is not null
      )
  ) then raise exception 'Answer every required screening question'; end if;

  select * into v_existing from public.job_applications
  where job_posting_id = p_job_id and applicant_id = auth.uid();

  if v_existing.id is null then
    insert into public.job_applications(job_posting_id, applicant_id, cv_url, document_urls, cover_letter_text, photo_url, application_revision, needs_reapply, updated_at)
    values(p_job_id, auth.uid(), coalesce(p_cv_url, ''), v_documents, nullif(trim(p_cover_letter), ''), nullif(trim(coalesce(p_photo_url, '')), ''), v_job.application_revision, false, now())
    returning id into v_id;
  else
    if not coalesce(v_existing.needs_reapply, false) then raise exception 'You already applied to this role'; end if;
    update public.job_applications
    set cv_url = coalesce(p_cv_url, ''), document_urls = v_documents, cover_letter_text = nullif(trim(p_cover_letter), ''), photo_url = nullif(trim(coalesce(p_photo_url, '')), ''), application_revision = v_job.application_revision, needs_reapply = false, status = 'new', applied_at = now(), updated_at = now()
    where id = v_existing.id returning id into v_id;
    delete from public.job_question_answers where application_id = v_id and question_kind = 'screening';
  end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb)) loop
    if exists (select 1 from public.screening_questions q where q.id = (v_item->>'questionId')::uuid and q.job_posting_id = p_job_id) then
      insert into public.job_question_answers(application_id, question_id, question_kind, answer_value)
      values(v_id, (v_item->>'questionId')::uuid, 'screening', coalesce(v_item->>'value', ''));
    end if;
  end loop;
  return v_id;
end
$$;

revoke all on function public.submit_job_application(uuid, text, text, jsonb, text, jsonb) from public, anon;
grant execute on function public.submit_job_application(uuid, text, text, jsonb, text, jsonb) to authenticated;