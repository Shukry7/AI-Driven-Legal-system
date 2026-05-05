-- Registration approvals and professional verification fields

alter table public.profiles
  add column if not exists phone text,
  add column if not exists profession text,
  add column if not exists profession_other text,
  add column if not exists professional_id_number text,
  add column if not exists approval_status text not null default 'pending',
  add column if not exists approval_reason text,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_approval_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_approval_status_check
      check (approval_status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

create index if not exists profiles_approval_status_idx
  on public.profiles (approval_status);

update public.profiles
set approval_status = 'approved'
where approval_status is null;

create or replace function public.handle_new_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    phone,
    profession,
    profession_other,
    professional_id_number,
    approval_status
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'phone', ''),
    nullif(new.raw_user_meta_data->>'profession', ''),
    nullif(new.raw_user_meta_data->>'profession_other', ''),
    nullif(new.raw_user_meta_data->>'professional_id_number', ''),
    coalesce(nullif(new.raw_user_meta_data->>'approval_status', ''), 'pending')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.prevent_profile_approval_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    if (new.approval_status is distinct from old.approval_status)
      or (new.approval_reason is distinct from old.approval_reason)
      or (new.approved_at is distinct from old.approved_at)
      or (new.approved_by is distinct from old.approved_by) then
      raise exception 'Approval fields can only be updated by admins';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_approval_update on public.profiles;
create trigger profiles_prevent_approval_update
before update on public.profiles
for each row execute procedure public.prevent_profile_approval_changes();
