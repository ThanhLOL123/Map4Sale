-- ===========================================================================
-- Map4Sale — one-shot PRODUCTION setup
-- ===========================================================================
-- Paste this whole file into the Supabase SQL editor and run it once.
-- It creates all tables (with every column the app uses), the profile trigger,
-- role helpers, Row Level Security, and the public image/video Storage bucket.
--
-- Safe to re-run: tables use IF NOT EXISTS, functions use CREATE OR REPLACE,
-- and every policy is dropped before being (re)created.
-- Supersedes running migrations 0001 + 0002 + 0003 separately.
-- No seed data — the database starts empty; add universities via the admin panel.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.universities (
  id              uuid primary key default gen_random_uuid(),
  name_kr         text not null default '',
  name_en         text not null default '',
  name_vi         text not null default '',
  logo_url        text,
  image_urls      jsonb not null default '[]'::jsonb,
  video_urls      jsonb not null default '[]'::jsonb,
  lat             double precision not null,
  lng             double precision not null,
  city            text not null default '',
  region          text not null default '',
  type            text not null default 'private' check (type in ('public', 'private')),
  ranking         int,
  is_featured     boolean not null default false,
  country         text not null default 'kr' check (country in ('kr', 'tw')),
  majors          jsonb not null default '[]'::jsonb,
  majors_detail   text not null default '',
  tuition         text not null default '',
  scholarship     text not null default '',
  topik_req       text not null default '',
  ielts_req       text not null default '',
  gpa_req         text not null default '',
  dorm_info       text not null default '',
  living_cost     text not null default '',
  important_notes text not null default '',
  sale_notes      text not null default '',
  updated_at      timestamptz not null default now()
);

-- If the table already existed (e.g. from an older migration), make sure the
-- newer columns are present.
alter table public.universities add column if not exists video_urls      jsonb not null default '[]'::jsonb;
alter table public.universities add column if not exists important_notes text  not null default '';
alter table public.universities add column if not exists majors_detail   text  not null default '';
alter table public.universities add column if not exists is_featured     boolean not null default false;
alter table public.universities add column if not exists country         text    not null default 'kr';
-- An older table gets the column without the inline check above, so add it here
-- (guarded: `add constraint` has no `if not exists`).
do $$
begin
  if not exists (select 1 from pg_constraint
                 where conrelid = 'public.universities'::regclass
                   and pg_get_constraintdef(oid) like '%country%') then
    alter table public.universities
      add constraint universities_country_check check (country in ('kr', 'tw'));
  end if;
end $$;

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
  browser    text not null default '',
  -- 'login' = password sign-in, 'resume' = app opened with a live session.
  kind       text not null default 'login'
);

-- Existing databases created before activity tracking (migration 0006).
alter table public.login_logs add column if not exists kind text not null default 'login';

do $$
begin
  alter table public.login_logs
    add constraint login_logs_kind_check check (kind in ('login', 'resume'));
exception
  when duplicate_object then null;
end $$;

create index if not exists login_logs_user_id_idx on public.login_logs (user_id, login_at desc);

-- One row per semantic action taken by a sale user (see src/lib/activity.ts).
create table if not exists public.activity_events (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  occurred_at   timestamptz not null default now(),
  event_type    text not null check (event_type in ('school_view', 'search', 'filter')),
  -- Nulled rather than cascaded: deleting a school must not erase the record of
  -- the work done on it. `detail` carries the name as it was when viewed.
  university_id uuid references public.universities (id) on delete set null,
  detail        text not null default '',
  result_count  int
);

create index if not exists activity_events_user_time_idx
  on public.activity_events (user_id, occurred_at desc);
create index if not exists activity_events_time_idx
  on public.activity_events (occurred_at desc);

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
-- Activity tracking helpers (migration 0006)
-- ---------------------------------------------------------------------------

-- Identity and time are stamped server-side. user_id is overwritten outright,
-- so nobody can attribute work to somebody else. occurred_at is only *clamped*:
-- the client's per-event time is the accurate one, and a batch of 20 rows shares
-- one transaction, so now() would collapse them onto a single instant and lose
-- the drill-down's ordering. auth.uid() is null for service-role inserts, which
-- pass through untouched so fixtures and backfills stay possible.
create or replace function public.stamp_activity_event()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.user_id := auth.uid();
    if new.occurred_at is null
       or new.occurred_at > now() + interval '1 minute'
       or new.occurred_at < now() - interval '1 hour'
    then
      new.occurred_at := clock_timestamp();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists activity_events_stamp on public.activity_events;
create trigger activity_events_stamp
  before insert on public.activity_events
  for each row execute function public.stamp_activity_event();

-- Per-staff summary for the admin activity screen. security definer so it can
-- aggregate across users; the is_admin() filter means a sale user gets an empty
-- result rather than an error, which leaks nothing and needs no client handling.
create or replace function public.activity_summary(from_ts timestamptz, to_ts timestamptz)
returns table (
  user_id        uuid,
  full_name      text,
  email          text,
  last_access_at timestamptz,
  sessions       bigint,
  actions        bigint,
  schools_viewed bigint,
  searches       bigint
)
language sql
security definer set search_path = public
stable
as $$
  select
    p.id,
    p.full_name,
    p.email,
    -- greatest() ignores nulls here, so someone who signed in but did nothing
    -- still reports a last access.
    greatest(l.last_login, a.last_action),
    coalesce(l.sessions, 0),
    coalesce(a.actions, 0),
    coalesce(a.schools_viewed, 0),
    coalesce(a.searches, 0)
  from public.profiles p
  left join lateral (
    select count(*) as sessions, max(ll.login_at) as last_login
    from public.login_logs ll
    where ll.user_id = p.id
      and ll.login_at >= from_ts
      and ll.login_at <  to_ts
  ) l on true
  left join lateral (
    select
      count(*)                                         as actions,
      count(distinct ae.university_id)
        filter (where ae.event_type = 'school_view')   as schools_viewed,
      count(*) filter (where ae.event_type = 'search') as searches,
      max(ae.occurred_at)                              as last_action
    from public.activity_events ae
    where ae.user_id = p.id
      and ae.occurred_at >= from_ts
      and ae.occurred_at <  to_ts
  ) a on true
  where public.is_admin()
  order by greatest(l.last_login, a.last_action) desc nulls last, p.full_name;
$$;

revoke all on function public.activity_summary(timestamptz, timestamptz) from public;
grant execute on function public.activity_summary(timestamptz, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.universities enable row level security;
alter table public.profiles enable row level security;
alter table public.login_logs enable row level security;
alter table public.activity_events enable row level security;

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

-- activity_events: an active user inserts only their own rows, only admins read.
-- No update or delete policy at all — nobody can edit or erase a trail.
drop policy if exists "own_insert_activity" on public.activity_events;
create policy "own_insert_activity" on public.activity_events
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_active_user());

drop policy if exists "admin_read_activity" on public.activity_events;
create policy "admin_read_activity" on public.activity_events
  for select to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage: public bucket for university images/videos, admin-only writes
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

-- ===========================================================================
-- Done. Next: deploy the Edge Functions, set the Vercel env vars, and promote
-- your first user to admin — see PRODUCTION.md.
-- ===========================================================================
