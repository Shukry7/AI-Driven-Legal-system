-- Billing cycle options per tier + protect core tiers from deletion

create table if not exists public.membership_billing_options (
  tier_code text not null references public.membership_tiers(code) on delete cascade,
  billing_cycle text not null check (billing_cycle in ('monthly', 'yearly')),
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tier_code, billing_cycle)
);

insert into public.membership_billing_options (tier_code, billing_cycle, is_enabled)
select t.code, c.cycle, true
from public.membership_tiers t
cross join (values ('monthly'), ('yearly')) as c(cycle)
on conflict (tier_code, billing_cycle) do nothing;

alter table public.membership_billing_options enable row level security;

create policy "membership_billing_options_read" on public.membership_billing_options
  for select
  using (true);

create policy "membership_billing_options_admin_write" on public.membership_billing_options
  for insert
  with check (public.is_admin());

create policy "membership_billing_options_admin_update" on public.membership_billing_options
  for update
  using (public.is_admin());

create policy "membership_billing_options_admin_delete" on public.membership_billing_options
  for delete
  using (public.is_admin());

create or replace function public.prevent_core_tier_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.code in ('free', 'pro', 'premium') then
    raise exception 'Core tiers cannot be deleted';
  end if;
  return old;
end;
$$;

drop trigger if exists protect_core_tiers on public.membership_tiers;
create trigger protect_core_tiers
before delete on public.membership_tiers
for each row execute procedure public.prevent_core_tier_delete();
