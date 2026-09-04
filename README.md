# Map4Sale — Bản đồ trường đại học Hàn Quốc

Interactive map of South Korean universities for study-abroad sales consulting.
Sales staff click any university marker to instantly see the full profile —
programs, tuition, admission requirements, scholarships, housing, living costs,
photos and internal sales notes — without leaving the map.

Built with **React + React-Leaflet** (OpenStreetMap tiles, marker clustering)
and **Supabase** (PostgreSQL, Auth, Storage, Edge Functions). Frontend deploys
to **Vercel**; everything fits in the free tiers.

## Features

- 🗺️ Full map of South Korea with one marker per university, clustered in dense areas (Seoul)
- 🏫 Side drawer with the complete school profile, logo, campus photo gallery and videos
- 🏷️ University name shown as an always-visible label on each map marker
- 🎥 Videos per school — admin uploads a file or pastes a link (YouTube/Vimeo/direct)
- 🔎 Search by **ngành học**: accent- and word-order-insensitive ("quan tri kinh doanh"
  finds "Quản trị kinh doanh"), best match first; plus filters for region, major,
  school type, max tuition and ranking. Results are listed in a docked panel
  beside the map; hovering a result highlights that school's pin (and back)
- 🔐 Email/password login (Supabase Auth) with `admin` / `sale` roles and RLS
- 🛠️ Admin panel: university CRUD (coordinates by map click or Nominatim geocoding),
  logo & photo uploads to Supabase Storage, sales-account management
  (create / disable / re-enable / password reset), login log dashboard
- 🕒 Login tracking: each login records IP → city/country (via ip-api.com) and
  browser/device, with unexpected-country highlighting
- 📊 Activity tracking: every app open, school profile opened, search and filter
  is recorded, summarised per staff member over a date range with a detailed
  drill-down; activity data is kept for 30 days

## Quick start (demo mode)

```bash
npm install
npm run dev
```

Without Supabase credentials the app runs in **demo mode**: it loads a bundled
sample dataset of 22 real universities, skips login and treats you as an admin
so every screen is browsable. Admin edits are kept in memory only.

## Going live with Supabase

> **Production?** Follow **[PRODUCTION.md](PRODUCTION.md)** — a step-by-step runbook that
> uses the consolidated one-shot script [`supabase/production_setup.sql`](supabase/production_setup.sql)
> (schema + RLS + Storage in a single paste-and-run). The steps below are the same
> flow in brief.

1. **Create a project** at [supabase.com](https://supabase.com) (free tier).

2. **Run the migration**: paste `supabase/migrations/0001_init.sql` into the
   SQL editor (or `supabase db push`), then the later numbered files in the
   same folder. They create the `universities`, `profiles`, `login_logs` and
   `activity_events` tables, RLS policies, the profile-creation trigger, and
   the public `university-images` Storage bucket with admin-only write
   policies. (`supabase/production_setup.sql` does all of it in one go.)

3. **Deploy the Edge Functions** (they hold the service-role key — privileged
   operations never run in the browser):

   ```bash
   supabase functions deploy create-user
   supabase functions deploy manage-user
   supabase functions deploy log-login
   ```

   `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are
   provided to functions automatically by Supabase.

4. **Create the first admin**: add a user in Authentication → Users, then:

   ```sql
   update public.profiles set role = 'admin' where email = 'admin@yourcompany.vn';
   ```

5. **Configure the frontend**: copy `.env.example` to `.env` and fill in
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Two optional keys:
   - `VITE_CARTO_API_KEY` — the street basemap comes from CARTO, which now
     stamps "API KEY REQUIRED" across every tile unless a key is supplied. The
     key is free (fair use, 5M tiles/month) and needs no CARTO account:
     [carto.com/basemaps/apikey](https://carto.com/basemaps/apikey).
   - `VITE_MAPBOX_TOKEN` — a Mapbox public token enabling the satellite basemap
     toggle; without it the map has no satellite button and everything else
     behaves normally.

6. **Load data**: sign in as the admin and add universities through
   *Quản trị → Trường đại học* (the sample dataset in
   `src/data/universities.sample.json` is a useful starting template).

## Deployment (Vercel)

Import the repo in Vercel, set the two `VITE_*` environment variables, and use
the default Vite build (`npm run build`, output `dist/`). Add a rewrite so
client-side routes resolve: create `vercel.json` with
`{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`
(already included in this repo).

## Project layout

```
src/
  lib/        types, Supabase client, data layer (Supabase or demo), filters
  data/       bundled sample dataset (demo mode)
  auth/       AuthContext, login page, route guards
  map/        map view, marker clustering, filter bar, detail drawer
  admin/      university CRUD + uploads, accounts, login logs, staff activity
supabase/
  migrations/ schema + RLS + storage policies
  functions/  create-user, manage-user, log-login (Deno Edge Functions)
```

## Notes & constraints

- IP geolocation is approximate (city-level); VPNs show the VPN server's
  location, and localhost logins record no location.
- ip-api.com free tier is HTTP-only (~45 req/min) — plenty for login events.
- Compress images before upload (≤ ~1600px) to stay within the Storage free tier;
  deleting a school or photo also removes its files from Storage.
- Inform sales staff that login locations **and in-app activity** (schools
  opened, searches, filters) are recorded.
