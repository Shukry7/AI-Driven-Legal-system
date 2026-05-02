-- Allow token consumption RPC to run in a write transaction (POST)

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
