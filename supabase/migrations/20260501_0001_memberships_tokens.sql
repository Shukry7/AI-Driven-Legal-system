-- Memberships + token usage schema

create extension if not exists "pgcrypto";

create table if not exists public.membership_tiers (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  monthly_tokens integer,
  is_unlimited boolean not null default false,
  created_at timestamptz not null default now()
);

insert into public.membership_tiers (code, name, monthly_tokens, is_unlimited)
values
  ('free', 'Free', 100, false),
  ('pro', 'Pro', 1000, false),
  ('premium', 'Premium', null, true)
on conflict (code) do nothing;

create table if not exists public.user_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier_id uuid not null references public.membership_tiers(id),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.token_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  month_key text not null,
  tokens_used integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, month_key)
);

create table if not exists public.token_ledger (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  amount integer not null,
  month_key text not null,
  created_at timestamptz not null default now()
);

alter table public.membership_tiers enable row level security;
alter table public.user_memberships enable row level security;
alter table public.token_usage enable row level security;
alter table public.token_ledger enable row level security;

create policy "membership_tiers_read" on public.membership_tiers
  for select
  using (true);

create policy "user_memberships_read" on public.user_memberships
  for select
  using (auth.uid() = user_id);

create policy "user_memberships_upsert" on public.user_memberships
  for insert
  with check (auth.uid() = user_id);

create policy "user_memberships_update" on public.user_memberships
  for update
  using (auth.uid() = user_id);

create policy "token_usage_read" on public.token_usage
  for select
  using (auth.uid() = user_id);

create policy "token_usage_write" on public.token_usage
  for insert
  with check (auth.uid() = user_id);

create policy "token_usage_update" on public.token_usage
  for update
  using (auth.uid() = user_id);

create policy "token_ledger_read" on public.token_ledger
  for select
  using (auth.uid() = user_id);

create policy "token_ledger_write" on public.token_ledger
  for insert
  with check (auth.uid() = user_id);

create or replace function public.current_month_key()
returns text
language sql
stable
as $$
  select to_char(now() at time zone 'utc', 'YYYY-MM');
$$;

create or replace function public.ensure_membership(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tier_id uuid;
begin
  select tier_id into v_tier_id
  from public.user_memberships
  where user_id = p_user_id;

  if v_tier_id is null then
    select id into v_tier_id from public.membership_tiers where code = 'free';
    insert into public.user_memberships (user_id, tier_id)
    values (p_user_id, v_tier_id)
    on conflict (user_id) do update set tier_id = excluded.tier_id;
  end if;

  return v_tier_id;
end;
$$;

create or replace function public.get_token_snapshot(p_user_id uuid default auth.uid())
returns table (
  tier_code text,
  monthly_limit integer,
  tokens_used integer,
  tokens_remaining integer,
  is_unlimited boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tier_id uuid;
  v_code text;
  v_limit integer;
  v_unlimited boolean;
  v_month_key text;
  v_used integer;
begin
  if p_user_id is null then
    raise exception 'Authentication required';
  end if;

  v_tier_id := public.ensure_membership(p_user_id);
  select code, monthly_tokens, is_unlimited
    into v_code, v_limit, v_unlimited
  from public.membership_tiers
  where id = v_tier_id;

  v_month_key := public.current_month_key();
  select tokens_used into v_used
  from public.token_usage
  where user_id = p_user_id and month_key = v_month_key;

  if v_used is null then
    v_used := 0;
  end if;

  tier_code := v_code;
  monthly_limit := v_limit;
  tokens_used := v_used;
  is_unlimited := v_unlimited;
  if v_unlimited then
    tokens_remaining := null;
  else
    tokens_remaining := greatest(v_limit - v_used, 0);
  end if;
  return next;
end;
$$;

create or replace function public.consume_tokens(
  p_user_id uuid default auth.uid(),
  p_feature text,
  p_amount integer
)
returns table (
  ok boolean,
  tokens_used integer,
  tokens_remaining integer,
  monthly_limit integer,
  is_unlimited boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tier_id uuid;
  v_code text;
  v_limit integer;
  v_unlimited boolean;
  v_month_key text;
  v_used integer;
begin
  if p_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Invalid token amount';
  end if;

  v_tier_id := public.ensure_membership(p_user_id);
  select code, monthly_tokens, is_unlimited
    into v_code, v_limit, v_unlimited
  from public.membership_tiers
  where id = v_tier_id;

  v_month_key := public.current_month_key();

  insert into public.token_usage (user_id, month_key, tokens_used)
  values (p_user_id, v_month_key, 0)
  on conflict (user_id, month_key) do nothing;

  select tokens_used into v_used
  from public.token_usage
  where user_id = p_user_id and month_key = v_month_key
  for update;

  if v_unlimited is false and (v_used + p_amount) > v_limit then
    ok := false;
    tokens_used := v_used;
    monthly_limit := v_limit;
    is_unlimited := v_unlimited;
    tokens_remaining := greatest(v_limit - v_used, 0);
    return next;
  end if;

  update public.token_usage
  set tokens_used = tokens_used + p_amount,
      updated_at = now()
  where user_id = p_user_id and month_key = v_month_key;

  insert into public.token_ledger (user_id, feature, amount, month_key)
  values (p_user_id, p_feature, p_amount, v_month_key);

  select tokens_used into v_used
  from public.token_usage
  where user_id = p_user_id and month_key = v_month_key;

  ok := true;
  tokens_used := v_used;
  monthly_limit := v_limit;
  is_unlimited := v_unlimited;
  if v_unlimited then
    tokens_remaining := null;
  else
    tokens_remaining := greatest(v_limit - v_used, 0);
  end if;
  return next;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tier_id uuid;
begin
  select id into v_tier_id from public.membership_tiers where code = 'free';
  insert into public.user_memberships (user_id, tier_id)
  values (new.id, v_tier_id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
