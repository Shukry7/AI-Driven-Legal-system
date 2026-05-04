-- User profiles + avatar storage

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  username text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_read_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create or replace function public.handle_new_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute procedure public.handle_new_profile();

-- Create avatars bucket if it doesn't exist (using SQL function instead of direct insert)
do $$
begin
  insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;
exception
  when insufficient_privilege then
    raise notice 'Skipping bucket creation - insufficient privileges. Create bucket via Supabase Dashboard instead.';
end $$;

-- For policies, we need to use dynamic SQL or skip them in migrations
-- since regular users can't modify storage.objects policies
-- These policies need to be created via Supabase Dashboard or by an admin

-- Alternative: Create a function that can be executed by an admin to set up policies
-- Or document the required policies to be added manually

do $$
declare
  policy_exists boolean;
begin
  -- Check if we have permission to create policies
  begin
    -- Try to create policies - this will fail if not admin
    execute format('
      create policy "avatar_read_public" on storage.objects
        for select using (bucket_id = ''avatars'')
    ');
    
    execute format('
      create policy "avatar_insert_own" on storage.objects
        for insert with check (bucket_id = ''avatars'' and auth.uid() = owner)
    ');
    
    execute format('
      create policy "avatar_update_own" on storage.objects
        for update using (bucket_id = ''avatars'' and auth.uid() = owner)
    ');
    
    execute format('
      create policy "avatar_delete_own" on storage.objects
        for delete using (bucket_id = ''avatars'' and auth.uid() = owner)
    ');
    
    raise notice 'Storage policies created successfully';
  exception
    when insufficient_privilege then
      raise notice 'Cannot create storage policies due to insufficient privileges. Please add these policies manually in the Supabase Dashboard:
        - avatar_read_public: SELECT on storage.objects for bucket_id = ''avatars''
        - avatar_insert_own: INSERT on storage.objects with check (bucket_id = ''avatars'' and auth.uid() = owner)
        - avatar_update_own: UPDATE on storage.objects using (bucket_id = ''avatars'' and auth.uid() = owner)
        - avatar_delete_own: DELETE on storage.objects using (bucket_id = ''avatars'' and auth.uid() = owner)';
    when others then
      raise notice 'Error creating policies: %', SQLERRM;
  end;
end $$;