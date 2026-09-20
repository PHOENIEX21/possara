create or replace function public.protect_email_verified_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.email_verified_at is distinct from old.email_verified_at
     and current_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception 'email_verified_at can only be changed by the verification service'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_email_verification on public.profiles;
create trigger protect_profile_email_verification
before update of email_verified_at on public.profiles
for each row
execute function public.protect_email_verified_at();

revoke execute on function public.protect_email_verified_at() from public, anon, authenticated;
grant execute on function public.protect_email_verified_at() to service_role;
