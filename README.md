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
- 🔎 Search + filters: region, program/major, school type, max tuition, ranking; docked list beside the map
- 🔐 Email/password login (Supabase Auth) with `admin` / `sale` roles and RLS
- 🛠️ Admin panel: university CRUD (coordinates by map click or Nominatim geocoding),
  logo & photo uploads to Supabase Storage, sales-account management
  (create / disable / re-enable / password reset), login log dashboard
- 🕒 Login tracking: each login records IP → city/country (via ip-api.com) and
  browser/device, with unexpected-country highlighting

## Quick start (demo mode)

```bash
npm install
npm run dev
```

Without Supabase credentials the app runs in **demo mode**: it loads a bundled
sample dataset of 22 real universities, skips login and treats you as an admin
so every screen is browsable. Admin edits are kept in memory only.

## Going live with Supabase

1. **Create a project** at [supabase.com](https://supabase.com) (free tier).

2. **Run the migration**: paste `supabase/migrations/0001_init.sql` into the
   SQL editor (or `supabase db push`). It creates the `universities`,
   `profiles` and `login_logs` tables, RLS policies, the profile-creation
   trigger, and the public `university-images` Storage bucket with
   admin-only write policies.

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
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

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
  admin/      university CRUD + uploads, accounts, login logs
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
- Inform sales staff that login locations are recorded.
