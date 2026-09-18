drop function if exists public.submit_job_cbt(uuid,jsonb,timestamptz);
revoke all on function public.guard_organization_verification() from public,anon,authenticated;
revoke all on function public.enforce_verified_job_publish() from public,anon,authenticated;
revoke all on function public.ensure_organization_owner_membership() from public,anon,authenticated;