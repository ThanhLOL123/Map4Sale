-- Map4Sale — add campus video support (uploaded files or pasted links).
-- Run after 0002 via the Supabase SQL editor or `supabase db push`.

alter table public.universities
  add column if not exists video_urls jsonb not null default '[]'::jsonb;
