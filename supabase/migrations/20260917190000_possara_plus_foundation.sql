create table if not exists public.possara_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','plus')),
  status text not null default 'inactive' check (status in ('inactive','trialing','active','past_due','cancelled')),
  trial_ends_at timestamptz null,
  current_period_end timestamptz null,
  provider text null,
  provider_customer_ref text null,
  provider_subscription_ref text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.opportunity_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  status text not null default 'preparing' check (status in ('preparing','applied','interview','accepted','rejected','withdrawn')),
  notes text null,
  next_step text null,
  next_step_due_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, opportunity_id)
);

create table if not exists public.opportunity_application_tasks (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.opportunity_applications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 240),
  done boolean not null default false,
  due_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.growth_passport_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('skill','project','learning','achievement','service','opportunity')),
  title text not null,
  issuer text null,
  description text null,
  evidence_url text null,
  occurred_on date null,
  visibility text not null default 'private' check (visibility in ('private','public')),
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.possara_subscriptions enable row level security;
alter table public.opportunity_applications enable row level security;
alter table public.opportunity_application_tasks enable row level security;
alter table public.growth_passport_items enable row level security;

drop policy if exists "Users can read own subscription" on public.possara_subscriptions;
create policy "Users can read own subscription" on public.possara_subscriptions for select using (user_id = auth.uid());
drop policy if exists "Admins manage subscriptions" on public.possara_subscriptions;
create policy "Admins manage subscriptions" on public.possara_subscriptions for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Users manage own application tracker" on public.opportunity_applications;
create policy "Users manage own application tracker" on public.opportunity_applications for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Users manage own application tasks" on public.opportunity_application_tasks;
create policy "Users manage own application tasks" on public.opportunity_application_tasks for all using (user_id = auth.uid()) with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.opportunity_applications a
    where a.id = application_id and a.user_id = auth.uid()
  )
);

drop policy if exists "Users read own passport" on public.growth_passport_items;
create policy "Users read own passport" on public.growth_passport_items for select using (user_id = auth.uid());
drop policy if exists "Public passport items are readable" on public.growth_passport_items;
create policy "Public passport items are readable" on public.growth_passport_items for select using (visibility = 'public');
drop policy if exists "Users add own passport items" on public.growth_passport_items;
create policy "Users add own passport items" on public.growth_passport_items for insert with check (user_id = auth.uid() and verified = false);
drop policy if exists "Users update own passport items" on public.growth_passport_items;
create policy "Users update own passport items" on public.growth_passport_items for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Users delete own passport items" on public.growth_passport_items;
create policy "Users delete own passport items" on public.growth_passport_items for delete using (user_id = auth.uid());

create or replace function public.protect_passport_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then return new; end if;
  if tg_op = 'INSERT' then new.verified := false;
  elsif new.verified is distinct from old.verified then new.verified := old.verified;
  end if;
  return new;
end;
$$;
revoke all on function public.protect_passport_verification() from public;
drop trigger if exists protect_passport_verification_trigger on public.growth_passport_items;
create trigger protect_passport_verification_trigger before insert or update on public.growth_passport_items for each row execute function public.protect_passport_verification();

create index if not exists opportunity_applications_user_updated_idx on public.opportunity_applications (user_id, updated_at desc);
create index if not exists opportunity_application_tasks_application_idx on public.opportunity_application_tasks (application_id, done, created_at);
create index if not exists growth_passport_user_created_idx on public.growth_passport_items (user_id, created_at desc);
create index if not exists growth_passport_public_idx on public.growth_passport_items (user_id, created_at desc) where visibility = 'public';
