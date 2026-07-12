-- Map4Sale — add the "Thông tin lưu ý quan trọng" (important notes) field.
-- Run after 0001_init.sql via the Supabase SQL editor or `supabase db push`.

alter table public.universities
  add column if not exists important_notes text not null default '';
