-- Admin pricing + token management

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Allow admins to read/update all profiles
create policy if not exists "profiles_admin_read" on public.profiles
  for select
  using (public.is_admin());

create policy if not exists "profiles_admin_update" on public.profiles
  for update
  using (public.is_admin());

-- Pricing table for monthly/yearly billing
create table if not exists public.membership_prices (
  tier_code text not null references public.membership_tiers(code) on delete cascade,
  billing_cycle text not null check (billing_cycle in ('monthly', 'yearly')),
  price_usd numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tier_code, billing_cycle)
);

insert into public.membership_prices (tier_code, billing_cycle, price_usd)
values
  ('free', 'monthly', 0),
  ('free', 'yearly', 0),
  ('pro', 'monthly', 5),
  ('pro', 'yearly', 55),
  ('premium', 'monthly', 11),
  ('premium', 'yearly', 110)
on conflict (tier_code, billing_cycle) do nothing;

alter table public.membership_prices enable row level security;

create policy "membership_prices_read" on public.membership_prices
  for select
  using (true);

create policy "membership_prices_admin_write" on public.membership_prices
  for insert
  with check (public.is_admin());

create policy "membership_prices_admin_update" on public.membership_prices
  for update
  using (public.is_admin());

create policy "membership_prices_admin_delete" on public.membership_prices
  for delete
  using (public.is_admin());

-- Allow admins to update token limits on tiers
create policy "membership_tiers_admin_update" on public.membership_tiers
  for update
  using (public.is_admin());

-- Allow admins to update user memberships
create policy "user_memberships_admin_update" on public.user_memberships
  for update
  using (public.is_admin());
