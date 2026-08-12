-- Map4Sale — add the "Giới thiệu khoa – chuyên ngành" presentation field.
--
-- Kept separate from `majors`, which stays a jsonb array of plain strings: it
-- powers the "Ngành" filter dropdown, and that needs discrete values. This
-- column holds rich text (a faculty/major table) shown in the school profile.
--
-- Run after 0003_add_video_urls.sql via the Supabase SQL editor or `supabase db push`.

alter table public.universities
  add column if not exists majors_detail text not null default '';

-- Idempotent: safe to re-run against a database that already has this column.
