-- Fix ambiguous column references in token RPCs - use table aliases consistently

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

  -- Ensure user has a membership
  v_tier_id := public.ensure_membership(p_user_id);
  
  -- Get tier info with explicit table alias
  select mt.code, mt.monthly_tokens, mt.is_unlimited
    into v_code, v_limit, v_unlimited
  from public.membership_tiers mt
  where mt.id = v_tier_id;

  v_month_key := public.current_month_key();
  
  -- Get current usage with explicit table alias
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

-- Drop and recreate consume_tokens_internal with proper disambiguation
drop function if exists public.consume_tokens_internal(uuid, text, integer);

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
  v_current_used integer;
  v_new_used integer;
begin
  if p_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Invalid token amount';
  end if;

  -- Get user's membership tier
  v_tier_id := public.ensure_membership(p_user_id);
  
  -- Get tier limits with explicit table alias
  select mt.code, mt.monthly_tokens, mt.is_unlimited
    into v_code, v_limit, v_unlimited
  from public.membership_tiers mt
  where mt.id = v_tier_id;

  v_month_key := public.current_month_key();

  -- Ensure token_usage record exists (using explicit column references)
  insert into public.token_usage (user_id, month_key, tokens_used)
  values (p_user_id, v_month_key, 0)
  on conflict (user_id, month_key) do nothing;

  -- Get current usage with row lock using explicit table alias
  select tu.tokens_used into v_current_used
  from public.token_usage tu
  where tu.user_id = p_user_id and tu.month_key = v_month_key
  for update;

  if v_current_used is null then
    v_current_used := 0;
  end if;

  -- Check if user has enough tokens (unless unlimited)
  if (v_unlimited is false) and (v_current_used + p_amount) > v_limit then
    ok := false;
    tokens_used := v_current_used;
    monthly_limit := v_limit;
    is_unlimited := v_unlimited;
    if v_unlimited then
      tokens_remaining := null;
    else
      tokens_remaining := greatest(v_limit - v_current_used, 0);
    end if;
    return next;
    return;
  end if;

  -- Update token usage - FIX: use explicit table reference for the right side
  v_new_used := v_current_used + p_amount;
  
  update public.token_usage
  set tokens_used = v_new_used,
      updated_at = now()
  where user_id = p_user_id and month_key = v_month_key;

  -- Record in ledger
  insert into public.token_ledger (user_id, feature, amount, month_key)
  values (p_user_id, p_feature, p_amount, v_month_key);

  -- Return success response
  ok := true;
  tokens_used := v_new_used;
  monthly_limit := v_limit;
  is_unlimited := v_unlimited;

  if v_unlimited then
    tokens_remaining := null;
  else
    tokens_remaining := greatest(v_limit - v_new_used, 0);
  end if;

  return next;
end;
$$;

-- Recreate the wrapper function
create or replace function public.consume_tokens(
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
volatile
security definer
set search_path = public
as $$
begin
  return query
  select * from public.consume_tokens_internal(auth.uid(), p_feature, p_amount);
end;
$$;