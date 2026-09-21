create or replace function public.notify_job_application_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  job_row public.job_postings%rowtype;
  org_name text;
  applicant_name text;
  status_title text;
  status_message text;
begin
  select * into job_row from public.job_postings where id = new.job_posting_id;
  select name into org_name from public.organizations where id = job_row.organization_id;
  select coalesce(full_name,username,'A POSSARA member') into applicant_name from public.profiles where id = new.applicant_id;

  if tg_op = 'INSERT' then
    insert into public.notifications(user_id,type,title,message,link)
    select
      om.user_id,
      'job_application',
      'New application for ' || job_row.title,
      applicant_name || ' applied to ' || coalesce(org_name,'your organization') || '.',
      '/organizations/jobs/' || job_row.id::text || '/applicants/' || new.id::text
    from public.organization_members om
    where om.organization_id = job_row.organization_id
      and om.role in ('owner','recruiter')
      and om.user_id <> new.applicant_id;
    return new;
  end if;

  if new.status is distinct from old.status and new.status in ('shortlisted','rejected','hired') then
    status_title := case new.status
      when 'shortlisted' then 'You were shortlisted'
      when 'hired' then 'Hiring update: selected'
      when 'rejected' then 'Hiring update from ' || coalesce(org_name,'the organization')
    end;
    status_message := case new.status
      when 'shortlisted' then coalesce(org_name,'The organization') || ' shortlisted your application for ' || job_row.title || '.'
      when 'hired' then coalesce(org_name,'The organization') || ' marked your application for ' || job_row.title || ' as hired.'
      when 'rejected' then coalesce(org_name,'The organization') || ' updated your application for ' || job_row.title || ' to not selected.'
    end;

    insert into public.notifications(user_id,type,title,message,link)
    values(new.applicant_id,'job_application_status',status_title,status_message,'/applications');
  end if;

  return new;
end
$$;

drop trigger if exists notify_job_application_events on public.job_applications;
create trigger notify_job_application_events
after insert or update of status on public.job_applications
for each row execute function public.notify_job_application_events();

revoke execute on function public.notify_job_application_events() from public, anon, authenticated;
