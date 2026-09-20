drop policy if exists "No client access to email verification challenges" on public.email_verification_challenges;
create policy "No client access to email verification challenges"
on public.email_verification_challenges
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "No client access to password recovery limits" on public.password_recovery_limits;
create policy "No client access to password recovery limits"
on public.password_recovery_limits
for all
to anon, authenticated
using (false)
with check (false);

revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;
