alter table public.profiles
  add column if not exists email_verified_at timestamptz;

update public.profiles p
set email_verified_at = coalesce(u.email_confirmed_at, now())
from auth.users u
where u.id = p.id
  and p.email_verified_at is null;

create table if not exists public.email_verification_challenges (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts smallint not null default 0,
  last_sent_at timestamptz,
  resend_available_at timestamptz,
  send_window_started_at timestamptz not null default now(),
  send_count smallint not null default 0,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_verification_attempts_check check (attempts between 0 and 20),
  constraint email_verification_send_count_check check (send_count between 0 and 50)
);

alter table public.email_verification_challenges enable row level security;

revoke all on table public.email_verification_challenges from public, anon, authenticated;
grant select, insert, update, delete on table public.email_verification_challenges to service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  admin_user_id uuid;
begin
  insert into public.profiles (id, full_name, avatar_url, username, email_verified_at)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(new.raw_user_meta_data->>'avatar_url', ''),
    nullif(lower(trim(new.raw_user_meta_data->>'username')), ''),
    case
      when coalesce(new.raw_user_meta_data->>'possara_requires_email_verification', 'false') = 'true'
        then null
      else new.email_confirmed_at
    end
  );

  insert into public.user_roles (user_id, role, is_verified)
  values (new.id, 'user', false)
  on conflict (user_id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  select ur.user_id
  into admin_user_id
  from public.user_roles ur
  where ur.role = 'admin'
    and ur.is_verified = true
    and ur.is_banned = false
    and ur.user_id <> new.id
  order by ur.updated_at asc nulls last, ur.user_id
  limit 1;

  if admin_user_id is not null then
    insert into public.follows (follower_id, following_id)
    values (new.id, admin_user_id)
    on conflict (follower_id, following_id) do nothing;
  end if;

  return new;
end;
$$;
