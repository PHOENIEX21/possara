-- Keep organization verification authorization and state consistent across every app surface.

create or replace function public.guard_organization_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.verified is distinct from old.verified
      or new.verification_status is distinct from old.verification_status)
     and not public.is_admin() then
    raise exception 'Only POSSARA administrators can change organization verification';
  end if;

  if new.verified is true or new.verification_status = 'verified' then
    new.verified := true;
    new.verification_status := 'verified';
  elsif new.verified is false and new.verification_status = 'verified' then
    new.verification_status := 'unverified';
  end if;

  return new;
end
$$;

update public.organizations
set verified = true,
    verification_status = 'verified'
where verified is true
   or verification_status = 'verified';

revoke execute on function public.guard_organization_verification() from public, anon, authenticated;
revoke execute on function public.verify_org_on_opportunity_approval() from public, anon, authenticated;
