-- Ensure admins are auto-approved and allow admin approval updates

update public.profiles
set approval_status = 'approved'
where is_admin = true;

create or replace function public.prevent_profile_approval_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() or new.is_admin = true or old.is_admin = true then
    return new;
  end if;

  if (new.approval_status is distinct from old.approval_status)
    or (new.approval_reason is distinct from old.approval_reason)
    or (new.approved_at is distinct from old.approved_at)
    or (new.approved_by is distinct from old.approved_by) then
    raise exception 'Approval fields can only be updated by admins';
  end if;

  return new;
end;
$$;
