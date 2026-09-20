create table if not exists public.password_recovery_limits (
  email_hash text primary key,
  last_sent_at timestamptz,
  window_started_at timestamptz not null default now(),
  send_count smallint not null default 0,
  updated_at timestamptz not null default now(),
  constraint password_recovery_send_count_check check (send_count between 0 and 50)
);

alter table public.password_recovery_limits enable row level security;

revoke all on table public.password_recovery_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.password_recovery_limits to service_role;
