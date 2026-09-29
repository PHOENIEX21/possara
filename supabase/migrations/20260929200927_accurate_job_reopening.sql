-- Validate opening and deadline edits in the same transaction as the status write.
-- Existing expired roles are classified as closed by all clients; deadlines are
-- never silently extended and existing applications/assessments remain intact.
create function public.validate_job_open_deadline() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if new.status='open' and new.closes_at is not null and new.closes_at<=clock_timestamp() then
    raise exception 'Choose a future closing date or no deadline before opening applications.' using errcode='23514';
  end if;
  return new;
end
$$;
revoke all on function public.validate_job_open_deadline() from public, anon, authenticated;
create trigger validate_job_open_deadline before insert or update of status, closes_at
on public.job_postings for each row execute function public.validate_job_open_deadline();
