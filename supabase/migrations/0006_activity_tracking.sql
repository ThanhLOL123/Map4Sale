-- Map4Sale — sale-staff activity tracking: app-open records plus semantic events.
--
-- Run after 0005_add_is_featured.sql via the Supabase SQL editor or `supabase db push`.

-- ---------------------------------------------------------------------------
-- login_logs gains a kind: 'login' = password sign-in, 'resume' = the app was
-- opened with a session that was still valid. Returning staff used to produce
-- no record at all, so "last access" looked stale for daily users.
-- ---------------------------------------------------------------------------

alter table public.login_logs
  add column if not exists kind text not null default 'login';

do $$
begin
  alter table public.login_logs
    add constraint login_logs_kind_check check (kind in ('login', 'resume'));
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- activity_events — one row per semantic action (see src/lib/activity.ts).
-- Shaped after login_logs: text columns never null, cascade off profiles.
-- ---------------------------------------------------------------------------

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

-- The drill-down filters by staff member and date; the purge and the all-staff
-- range scan by time alone, which the composite index cannot serve.
create index if not exists activity_events_user_time_idx
  on public.activity_events (user_id, occurred_at desc);
create index if not exists activity_events_time_idx
  on public.activity_events (occurred_at desc);

-- ---------------------------------------------------------------------------
-- Identity and time are stamped server-side. user_id is overwritten outright,
-- so nobody can attribute work to somebody else. occurred_at is only *clamped*:
-- the client's per-event time is the accurate one, and a batch of 20 rows shares
-- one transaction, so now() would collapse them onto a single instant and lose
-- the drill-down's ordering. auth.uid() is null for service-role inserts, which
-- pass through untouched so fixtures and backfills stay possible.
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- Row Level Security: an active user inserts only their own rows, only admins
-- read. No update or delete policy at all — nobody can edit or erase a trail.
-- ---------------------------------------------------------------------------

alter table public.activity_events enable row level security;

drop policy if exists "own_insert_activity" on public.activity_events;
create policy "own_insert_activity" on public.activity_events
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_active_user());

drop policy if exists "admin_read_activity" on public.activity_events;
create policy "admin_read_activity" on public.activity_events
  for select to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Per-staff summary for the admin activity screen. security definer so it can
-- aggregate across users; the is_admin() filter means a sale user gets an empty
-- result rather than an error, which leaks nothing and needs no client handling.
-- ---------------------------------------------------------------------------

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
