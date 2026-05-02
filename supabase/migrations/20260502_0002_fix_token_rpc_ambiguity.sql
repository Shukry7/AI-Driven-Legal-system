-- Fix ambiguous column references in token RPCs

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
  select mt.code, mt.monthly_tokens, mt.is_unlimited
    into v_code, v_limit, v_unlimited
  from public.membership_tiers mt
  where mt.id = v_tier_id;

  v_month_key := public.current_month_key();
  select tu.tokens_used into v_used
  from public.token_usage tu
  where tu.user_id = p_user_id and tu.month_key = v_month_key;

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

create or replace function public.consume_tokens_internal(
  p_user_id uuid,
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
  select mt.code, mt.monthly_tokens, mt.is_unlimited
    into v_code, v_limit, v_unlimited
  from public.membership_tiers mt
  where mt.id = v_tier_id;

  v_month_key := public.current_month_key();

  insert into public.token_usage (user_id, month_key, tokens_used)
  values (p_user_id, v_month_key, 0)
  on conflict (user_id, month_key) do nothing;

  select tu.tokens_used into v_used
  from public.token_usage tu
  where tu.user_id = p_user_id and tu.month_key = v_month_key
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

  select tu.tokens_used into v_used
  from public.token_usage tu
  where tu.user_id = p_user_id and tu.month_key = v_month_key;

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
