-- Supabase Auth & Role-Based Access Control Setup

-- 1. Create a table for public profiles (linked to auth.users)
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  role text default 'user' check (role in ('user', 'admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Turn on Row Level Security (RLS) for the profiles table
alter table public.profiles enable row level security;

-- 3. Create policies & Helpers
-- Create a function to check if the current user is an admin without triggering RLS recursion
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer set search_path = public;

-- Allow users to view their own profile
drop policy if exists "Users can view own profile" on profiles;
create policy "Users can view own profile" 
  on profiles for select 
  using ( auth.uid() = id );

-- Allow admins to view all profiles (Non-recursive using function)
drop policy if exists "Admins can view all profiles" on profiles;
create policy "Admins can view all profiles" 
  on profiles for select 
  using ( is_admin() );

-- Allow admins to update all profiles (Non-recursive using function)
drop policy if exists "Admins can update all profiles" on profiles;
create policy "Admins can update all profiles" 
  on profiles for update 
  using ( is_admin() );

-- Allow users to update their own profile
drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile" 
  on profiles for update 
  using ( auth.uid() = id );

-- 4. Function: Automatically create a profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id, 
    new.email,
    -- Extract role from raw_user_meta_data if provided, else default to 'user'
    coalesce(new.raw_user_meta_data->>'role', 'user')
  );
  return new;
end;
$$ language plpgsql security definer;

-- 5. Trigger: Run the function every time a user is created
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- HOW TO MAKE SOMEONE AN ADMIN:
-- After a user signs up via your Login Page, go to the Supabase Table Editor.
-- Open the `profiles` table, find their record, and change the `role` cell from 'user' to 'admin'.
