-- Map4Sale — initial schema, RLS and storage setup.
-- Run via the Supabase SQL editor or `supabase db push`.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.universities (
  id          uuid primary key default gen_random_uuid(),
  name_kr     text not null default '',
  name_en     text not null default '',
  name_vi     text not null default '',
  logo_url    text,
  image_urls  jsonb not null default '[]'::jsonb,
  lat         double precision not null,
  lng         double precision not null,
  city        text not null default '',
  region      text not null default '',
  type        text not null default 'private' check (type in ('public', 'private')),
  ranking     int,
  majors      jsonb not null default '[]'::jsonb,
  tuition     text not null default '',
  scholarship text not null default '',
  topik_req   text not null default '',
  ielts_req   text not null default '',
  gpa_req     text not null default '',
  dorm_info   text not null default '',
  living_cost text not null default '',
  sale_notes  text not null default '',
  updated_at  timestamptz not null default now()
);

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  full_name  text not null default '',
  role       text not null default 'sale' check (role in ('admin', 'sale')),
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.login_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  login_at   timestamptz not null default now(),
  ip_address text not null default '',
  city       text not null default '',
  region     text not null default '',
  country    text not null default '',
  browser    text not null default ''
);

create index if not exists login_logs_user_id_idx on public.login_logs (user_id, login_at desc);

-- ---------------------------------------------------------------------------
-- Auto-create a profile row whenever an auth user is created
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'sale')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Role helpers (security definer avoids recursive RLS on profiles)
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active
  );
$$;

create or replace function public.is_active_user()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.universities enable row level security;
alter table public.profiles enable row level security;
alter table public.login_logs enable row level security;

-- universities: any *active* authenticated user reads; only admins write.
drop policy if exists "active_users_read_universities" on public.universities;
create policy "active_users_read_universities" on public.universities
  for select to authenticated
  using (public.is_active_user());

drop policy if exists "admin_write_universities" on public.universities;
create policy "admin_write_universities" on public.universities
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- profiles: users see their own row; admins see and manage all.
drop policy if exists "own_profile_read" on public.profiles;
create policy "own_profile_read" on public.profiles
  for select to authenticated
  using (id = auth.uid());

drop policy if exists "admin_read_profiles" on public.profiles;
create policy "admin_read_profiles" on public.profiles
  for select to authenticated
  using (public.is_admin());

drop policy if exists "admin_update_profiles" on public.profiles;
create policy "admin_update_profiles" on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- login_logs: admin read only. Rows are inserted by the log-login Edge
-- Function with the service-role key, which bypasses RLS.
drop policy if exists "admin_read_logs" on public.login_logs;
create policy "admin_read_logs" on public.login_logs
  for select to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage: public bucket for university images, admin-only writes
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('university-images', 'university-images', true)
on conflict (id) do nothing;

drop policy if exists "public_read_university_images" on storage.objects;
create policy "public_read_university_images" on storage.objects
  for select
  using (bucket_id = 'university-images');

drop policy if exists "admin_insert_university_images" on storage.objects;
create policy "admin_insert_university_images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'university-images' and public.is_admin());

drop policy if exists "admin_update_university_images" on storage.objects;
create policy "admin_update_university_images" on storage.objects
  for update to authenticated
  using (bucket_id = 'university-images' and public.is_admin());

drop policy if exists "admin_delete_university_images" on storage.objects;
create policy "admin_delete_university_images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'university-images' and public.is_admin());
