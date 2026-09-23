-- One request commits the vacancy and its screening form together. A stable
-- client request ID makes retrying a lost response safe without duplicate jobs.
create or replace function public.create_job_with_screening(p_request_id uuid, p_job jsonb, p_questions jsonb)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  v public.job_postings;
  existing public.job_postings;
  q jsonb;
  position integer := 0;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if p_request_id is null or jsonb_typeof(p_job) is distinct from 'object'
     or jsonb_typeof(p_questions) is distinct from 'array' then
    raise exception 'Invalid job submission';
  end if;
  v := jsonb_populate_record(null::public.job_postings, p_job);
  if not public.is_organization_manager(v.organization_id) then
    raise exception 'You cannot manage this organization' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
  select * into existing from public.job_postings where id=p_request_id;
  if found then
    if existing.posted_by<>auth.uid() or existing.organization_id<>v.organization_id then
      raise exception 'This request belongs to a different job' using errcode='42501';
    end if;
    return to_jsonb(existing);
  end if;
  if coalesce(trim(v.title),'')='' or coalesce(trim(v.role_type),'')=''
     or coalesce(trim(v.location),'')='' then raise exception 'Enter a title, role type and location'; end if;
  if v.pay_min<0 or v.pay_max<0 or v.pay_max<v.pay_min then raise exception 'Enter a valid pay range'; end if;
  if coalesce(v.status,'draft') not in ('draft','open') then raise exception 'Invalid initial job status'; end if;
  if v.status='open' and (coalesce(trim(v.description),'')='' or v.closes_at<=now()) then
    raise exception 'Add a description and a future closing date before publishing';
  end if;
  if coalesce(v.cbt_time_limit_seconds,900) not between 60 and 10800 then raise exception 'Assessment duration must be between 1 and 180 minutes'; end if;
  if jsonb_array_length(p_questions)>50 then raise exception 'Use at most 50 screening questions'; end if;

  insert into public.job_postings(id,organization_id,posted_by,title,role_type,rank,employment_type,work_style,location,pay_min,pay_max,description,requirements,requires_cbt,cbt_time_limit_seconds,status,closes_at,application_document_label,application_document_labels,application_document_accept,application_document_required,passport_photo_required,cover_letter_required,job_media_urls)
  values(p_request_id,v.organization_id,auth.uid(),trim(v.title),trim(v.role_type),coalesce(v.rank,'Entry'),coalesce(v.employment_type,'Full-time'),coalesce(v.work_style,'On-site'),trim(v.location),v.pay_min,v.pay_max,coalesce(trim(v.description),''),coalesce(v.requirements,'{}'),coalesce(v.requires_cbt,false),coalesce(v.cbt_time_limit_seconds,900),coalesce(v.status,'draft'),v.closes_at,coalesce(v.application_document_label,'CV / résumé'),coalesce(v.application_document_labels,array['CV / résumé']),coalesce(v.application_document_accept,array['application/pdf']),coalesce(v.application_document_required,true),coalesce(v.passport_photo_required,false),coalesce(v.cover_letter_required,false),coalesce(v.job_media_urls,'{}'))
  returning * into existing;

  for q in select value from jsonb_array_elements(p_questions) loop
    if coalesce(trim(q->>'questionText'),'')='' then raise exception 'Give every screening question a title'; end if;
    if q->>'answerType'='single_choice' then
      if jsonb_typeof(q->'choices') is distinct from 'array' then raise exception 'Add at least two distinct choices'; end if;
      if (select count(distinct lower(trim(value))) from jsonb_array_elements_text(q->'choices') where trim(value)<>'')<2
        or exists(select 1 from jsonb_array_elements_text(q->'choices') where trim(value)='')
        or (select count(distinct lower(trim(value))) from jsonb_array_elements_text(q->'choices'))<>jsonb_array_length(q->'choices') then
        raise exception 'Add at least two distinct, nonempty choices';
      end if;
    end if;
    insert into public.screening_questions(job_posting_id,question_text,answer_type,choices,required,sort_order)
    values(existing.id,trim(q->>'questionText'),q->>'answerType',case when q->>'answerType'='single_choice' then q->'choices' else null end,coalesce((q->>'required')::boolean,true),position);
    position:=position+1;
  end loop;
  return to_jsonb(existing);
end $$;
revoke all on function public.create_job_with_screening(uuid,jsonb,jsonb) from public,anon;
grant execute on function public.create_job_with_screening(uuid,jsonb,jsonb) to authenticated;

