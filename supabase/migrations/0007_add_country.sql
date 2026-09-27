-- Map4Sale — which country a school is in, for the Hàn Quốc / Đài Loan switch.
--
-- Run after 0006_activity_tracking.sql via the Supabase SQL editor or
-- `supabase db push`. Every existing school defaults to 'kr', so no data moves.
--
-- Run this BEFORE deploying the frontend that sends `country`: the app saves
-- whole rows, so until the column exists saving any school fails.

alter table public.universities
  add column if not exists country text not null default 'kr';

-- Guarded: `add constraint` has no `if not exists`, and this file must stay
-- re-runnable.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'universities_country_check'
  ) then
    alter table public.universities
      add constraint universities_country_check check (country in ('kr', 'tw'));
  end if;
end $$;
