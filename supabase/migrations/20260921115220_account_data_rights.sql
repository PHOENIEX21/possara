-- Account data-rights workflow. Deletion requests survive account removal with user_id anonymized.

create table public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  status text not null default 'requested' check(status in ('requested','canceled','processing','completed','rejected')),
  requested_at timestamptz not null default now(),
  canceled_at timestamptz,
  processed_at timestamptz,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.account_deletion_requests enable row level security;
revoke all on public.account_deletion_requests from anon, authenticated;
grant select,update on public.account_deletion_requests to authenticated;
grant all on public.account_deletion_requests to service_role;

create policy "Users view own deletion request"
on public.account_deletion_requests for select to authenticated
using ((select auth.uid()) = user_id or public.is_admin());

create policy "Admins update deletion requests"
on public.account_deletion_requests for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.request_account_deletion()
returns table(id uuid,status text,requested_at timestamptz)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Sign in first' using errcode='42501'; end if;
  return query
  insert into public.account_deletion_requests(user_id,status,requested_at,canceled_at,processed_at,admin_note,updated_at)
  values(v_user,'requested',now(),null,null,null,now())
  on conflict(user_id) do update
    set status='requested',requested_at=now(),canceled_at=null,processed_at=null,admin_note=null,updated_at=now()
  returning account_deletion_requests.id,account_deletion_requests.status,account_deletion_requests.requested_at;
end;
$$;
revoke execute on function public.request_account_deletion() from public,anon;
grant execute on function public.request_account_deletion() to authenticated;

create or replace function public.cancel_account_deletion()
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Sign in first' using errcode='42501'; end if;
  update public.account_deletion_requests
  set status='canceled',canceled_at=now(),updated_at=now()
  where user_id=v_user and status='requested';
  return found;
end;
$$;
revoke execute on function public.cancel_account_deletion() from public,anon;
grant execute on function public.cancel_account_deletion() to authenticated;
