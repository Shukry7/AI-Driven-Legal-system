-- RPC to approve/reject registrations with admin guard

create or replace function public.admin_update_approval(
  p_profile_id uuid,
  p_status text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can update approvals';
  end if;

  if p_status not in ('approved', 'rejected') then
    raise exception 'Invalid approval status';
  end if;

  update public.profiles
  set approval_status = p_status,
      approval_reason = case when p_status = 'rejected' then nullif(p_reason, '') else null end,
      approved_at = now(),
      approved_by = auth.uid()
  where id = p_profile_id;

  if not found then
    raise exception 'Profile not found';
  end if;
end;
$$;

revoke all on function public.admin_update_approval(uuid, text, text) from public;
grant execute on function public.admin_update_approval(uuid, text, text) to authenticated;
