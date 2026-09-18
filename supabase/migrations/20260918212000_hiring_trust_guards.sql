-- Server-side hiring trust controls. UI checks are not security boundaries.
create or replace function public.guard_organization_verification()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if (new.verified is distinct from old.verified or new.verification_status is distinct from old.verification_status)
 and not public.is_admin() then raise exception 'Only POSSARA administrators can change organization verification'; end if;
 return new;
end $$;
drop trigger if exists guard_organization_verification on public.organizations;
create trigger guard_organization_verification before update on public.organizations for each row execute function public.guard_organization_verification();

create or replace function public.enforce_verified_job_publish()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.status='open' and not exists(select 1 from public.organizations o where o.id=new.organization_id and (o.verified=true or o.verification_status='verified'))
 then raise exception 'Organization verification is required before publishing a job'; end if;
 return new;
end $$;
drop trigger if exists enforce_verified_job_publish on public.job_postings;
create trigger enforce_verified_job_publish before insert or update of status,organization_id on public.job_postings for each row execute function public.enforce_verified_job_publish();
