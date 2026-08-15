# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Map4Sale is an interactive map of South Korean universities for study-abroad sales consulting (a Vietnamese company). Sales staff click a marker to see the full school profile; admins manage universities, sale accounts, and login logs. Stack: React 18 + TypeScript + Vite, React-Leaflet (OpenStreetMap), Supabase (Postgres, Auth, Storage, Deno Edge Functions). Frontend deploys to Vercel.

## Commands

```bash
npm install
npm run dev        # Vite dev server (runs in demo mode without .env)
npm run build      # tsc -b && vite build — this is also the type check
npm run preview
```

There is no linter and no test framework configured. `npm run build` (or `npx tsc -b`) is the only automated check — run it before committing.

Edge Functions are Deno, not part of the npm build. They deploy via `supabase functions deploy <name>` or the GitHub Actions workflow `.github/workflows/deploy-functions.yml` (manual dispatch, plus auto-deploy on pushes to `main` that touch `supabase/functions/**`; the Supabase `PROJECT_REF` is hardcoded there).

## Architecture

### Demo mode vs live mode — the central pattern

`src/lib/supabase.ts` exports `isDemoMode`, true when `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are unset. In demo mode the app loads the bundled sample dataset (`src/data/universities.sample.json`), skips login entirely (everyone is a demo admin), and keeps edits in memory via `src/lib/demoStore.ts`.

**Every function in the data layer branches on `isDemoMode` first** and delegates to `demoStore` in demo mode. When adding any data operation, implement both paths — the app must remain fully browsable with no credentials.

### Data layer

`src/lib/api.ts` is the single data-access module. Components never call the Supabase client directly (the one exception is `AuthContext`, which handles auth itself). Key details:

- `normalizeUniversity()` coerces nullable jsonb columns (`image_urls`, `video_urls`, `majors`) to `[]` — new jsonb array columns must be added there.
- Storage uploads go to the public `university-images` bucket under `<universityId>/{logo|photos|videos}/`; deleting a university best-effort-removes its Storage folder.
- Geocoding uses Nominatim (restricted to `countrycodes=kr`).
- `src/lib/useUniversityBrowser.ts` is the shared hook for the map and docked-list views: one fetch, shared filter + selection state.
- `src/lib/filters.ts`: tuition is stored as free text; the max-tuition filter parses the *first number* in the string as million KRW per semester.

### Activity tracking

`src/lib/activity.ts` is the only tracker: `trackEvent()` buffers events and flushes them in batches with `fetch(..., { keepalive: true })` — **direct PostgREST inserts under RLS, not an Edge Function** (the trigger already stamps identity and time, and a function could not tell a real click from a scripted one either). `Prefer: return=minimal` is load-bearing: asking for the inserted rows back would need a select policy sale users must not have.

Events are emitted from one place — `useUniversityBrowser` wraps `setSelected` / `setFilters`, so every map pin, list row and filter control is instrumented without touching components. Search is debounced (the box fires per keystroke). Admin view: `src/admin/ActivityPage.tsx`, backed by the `activity_summary` RPC; a daily GitHub Action enforces 30-day retention.

### Privileged operations → Edge Functions

Anything needing the service-role key runs in `supabase/functions/` (Deno), never in the browser:

- `create-user` — creates a sale account. **No-email flow**: generates a random password and returns it once for the admin to hand over (avoids Supabase's built-in mailer rate limit).
- `manage-user` — actions `enable` / `disable` / `reset_password` (reset also returns a new password).
- `log-login` — fire-and-forget on each app open; resolves IP → city/country via ip-api.com and records browser/device. The request body's `kind` (whitelisted server-side) separates a password sign-in from a session resume.

`_shared/admin.ts` holds the shared plumbing: CORS headers, `serviceClient()` (service-role, bypasses RLS), `getCaller()` (resolves the JWT from the Authorization header), and `callerIsAdmin()`. `create-user` and `manage-user` verify the caller is an active admin before acting.

### Auth, roles, and RLS

Two roles: `admin` and `sale` (in `public.profiles`, auto-created by a trigger on `auth.users` insert; role comes from user metadata, defaulting to `sale`). RLS summary:

- `universities`: any *active* authenticated user reads; only admins write.
- `profiles`: users read their own row; admins read/update all.
- `login_logs`: admin read only; rows inserted by `log-login` with the service role.
- `activity_events`: an active user inserts *only their own* rows, admin read only, no update/delete policy at all — `user_id` and `occurred_at` are stamped by a `before insert` trigger, so neither can be forged.
- Storage: public read; admin-only write.

Deactivated accounts (`is_active = false`) are signed out client-side by `AuthContext` and blocked from data by the `is_active_user()` RLS helper. Routes: `/` (map) requires login; `/admin/*` requires admin — both enforced by `ProtectedRoute` in `src/App.tsx`.

### Database migrations — dual maintenance

Schema changes must be made in **two places**:

1. A new numbered file in `supabase/migrations/` (e.g. `0004_...sql`), idempotent (`if not exists` / `create or replace`).
2. `supabase/production_setup.sql` — the consolidated, re-runnable one-shot script that supersedes all migrations (used by the PRODUCTION.md runbook).

Also update `src/lib/types.ts`, `normalizeUniversity()` in `api.ts` if the column is a jsonb array, the university form in `src/admin/UniversityFormPage.tsx`, and `src/data/universities.sample.json` if the field should show in demo mode.

## Conventions

- **User-facing strings are Vietnamese** (UI labels, error messages — including errors thrown from `api.ts` and `AuthContext`). Code, comments, and identifiers are English.
- All styling lives in one plain CSS file: `src/styles/app.css`. No CSS framework or CSS-in-JS.
- Comments occasionally cite spec sections ("spec §4.3") from the original project spec; keep the style if editing near them.
- Vercel SPA routing depends on the rewrite in `vercel.json` — don't remove it.
- Keep the repo private: PRODUCTION.md's backup flow stores full-database artifacts in GitHub Actions.
- `PRODUCTION.md` is the go-live runbook. If you change setup steps, Edge Function behavior, or schema, check whether README.md and PRODUCTION.md need matching updates.
