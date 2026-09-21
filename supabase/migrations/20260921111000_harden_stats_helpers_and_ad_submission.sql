-- Harden harmless legacy stats/helpers and prevent client-side ad payment spoofing.

alter view public.member_stats set (security_invoker = true);
alter view public.platform_stats set (security_invoker = true);

revoke insert, update, delete, truncate, references, trigger
  on public.member_stats, public.platform_stats
  from anon, authenticated;
grant select on public.member_stats, public.platform_stats to anon, authenticated;

create or replace function public.is_online(seen timestamptz)
returns boolean
language sql
stable
set search_path = ''
as $$
  select seen is not null and seen > now() - interval '2 minutes';
$$;

create or replace function public.is_admin_or_mod()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role in ('admin','moderator')
  );
$$;

create or replace function public.is_banned()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_banned from public.user_roles where user_id = auth.uid()),
    false
  );
$$;

drop policy if exists "Signed-in users can submit ads as pending" on public.advertisements;
create policy "Signed-in users can submit ads as pending"
on public.advertisements
for insert
to authenticated
with check (
  auth.uid() = submitted_by
  and status = 'pending'
  and amount_paid is null
  and payment_reference is null
  and coalesce(currency,'NGN') = 'NGN'
);
