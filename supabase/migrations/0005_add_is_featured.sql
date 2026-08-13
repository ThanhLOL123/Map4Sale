-- Map4Sale — add a "Nổi bật" (Featured) flag shown as a star badge in the list.
--
-- Run after 0004_add_majors_detail.sql via the Supabase SQL editor or `supabase db push`.

alter table public.universities
  add column if not exists is_featured boolean not null default false;
