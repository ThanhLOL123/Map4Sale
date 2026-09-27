# Map4Sale — Production setup runbook

This takes the app from demo mode to a live Supabase backend. ~15 minutes.
Every step happens in **your own** Supabase / Vercel / GitHub accounts.

The app needs no code changes — it automatically leaves demo mode the moment
the two `VITE_SUPABASE_*` environment variables are set (see `src/lib/supabase.ts`).

---

## 1. Create the Supabase project
- Sign in at [supabase.com](https://supabase.com) → **New project**.
- **Region:** pick **Singapore** or **Seoul** (lowest latency for Vietnam/Korea).
- Save the database password somewhere safe.

## 2. Create the schema
- Open **SQL Editor** → **New query**.
- Paste the entire contents of [`supabase/production_setup.sql`](supabase/production_setup.sql) and **Run**.
- This creates the tables, the profile trigger, role helpers, Row Level Security,
  and the public `university-images` Storage bucket. It's safe to re-run.
- The database starts **empty** — you'll add universities from the admin panel.

## 3. Deploy the Edge Functions
These hold the service-role key and must run server-side (account creation,
disable/reset, login logging). `SUPABASE_URL`, `SUPABASE_ANON_KEY` and
`SUPABASE_SERVICE_ROLE_KEY` are injected into functions automatically.

**Option A — no computer needed (GitHub Actions, recommended).**
1. Create a Supabase access token at
   [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens).
2. GitHub repo → **Settings → Secrets and variables → Actions → New repository
   secret** → name `SUPABASE_ACCESS_TOKEN`, value = that token.
3. GitHub **Actions** tab → *Deploy Edge Functions* → **Run workflow**. It deploys
   all three. (It also auto-redeploys whenever you change a function on `main`.)
   - The project ref is set in `.github/workflows/deploy-functions.yml`; if you
     ever change projects, update `PROJECT_REF` there.

**Option B — from a computer with the [Supabase CLI](https://supabase.com/docs/guides/cli):**
```bash
supabase login
supabase link --project-ref <your-project-ref>     # ref is in the project URL / settings
supabase functions deploy create-user
supabase functions deploy manage-user
supabase functions deploy log-login
```

> These functions only power **creating sale accounts**, **disable/reset**, and
> **login tracking**. The map, university management, images/videos, and backup
> all work without them — so you can do steps 4–5 first and this afterward.

## 4. Point the frontend at Supabase (Vercel)
- In Supabase → **Project Settings → API**, copy the **Project URL** and the
  **anon public** key.
- In Vercel → your project → **Settings → Environment Variables**, add (Production):
  - `VITE_SUPABASE_URL` = the Project URL
  - `VITE_SUPABASE_ANON_KEY` = the anon public key
  - `VITE_CARTO_API_KEY` = a CARTO Basemaps key. Without it the street map is
    covered in "API KEY REQUIRED" watermarks. Free within CARTO's fair-use limit
    (5M tiles/month — far above this app's usage) and no account is needed:
    [carto.com/basemaps/apikey](https://carto.com/basemaps/apikey).
  - *(optional)* `VITE_MAPBOX_TOKEN` = a Mapbox public token (`pk.…`) to enable
    the satellite basemap toggle. Omit it and the map simply has no satellite
    button. Restrict the token to your domains in the Mapbox dashboard — it
    ships in the client bundle. Note that from Leaflet, Mapbox bills per **tile
    request**, not per map load, so watch usage in the first month.
- **Redeploy** (Deployments → ⋯ → Redeploy). The app now runs live — the
  yellow **DEMO** badge disappears and login is required.

### Upgrading an existing deployment

Schema changes land as numbered files in `supabase/migrations/`. Run any you
have not applied yet in the Supabase SQL editor — each is idempotent, so
re-running one is harmless:

- `0004_add_majors_detail.sql` — adds the "Giới thiệu khoa – chuyên ngành"
  rich-text column. Without it the profile section stays empty and saving a
  university fails on the unknown column.
- `0005_add_is_featured.sql` — adds the "Nổi bật" flag (the ★ in the school
  list). Without it, saving a university fails on the unknown column.
- `0006_activity_tracking.sql` — adds `login_logs.kind`, the `activity_events`
  table with its stamping trigger and RLS, and the `activity_summary` function
  behind **Quản trị → Hoạt động nhân viên**. Without it that page errors and
  tracking writes are rejected.

- `0007_add_country.sql` — adds `universities.country` (`'kr'` or `'tw'`,
  default `'kr'`) behind the **Hàn Quốc | Đài Loan** switch. Every existing
  school stays on the Korea map.
  ⚠️ **Run this before the frontend that uses it is deployed.** The app saves
  whole rows, so until the column exists, saving *any* school fails. (Reading
  is safe either way: without the column every school is treated as Korean.)

`supabase/production_setup.sql` already contains every column for a fresh
install; the migrations are only for databases created before a change.

### Checking what is actually deployed

Every build writes `/version.json`, served uncached, so one fixed URL always
reports the live commit:

```bash
curl -s https://map4-sale.vercel.app/version.json
# {"commit":"540f247…","shortCommit":"540f247","ref":"main","env":"production","builtAt":"…"}
```

Compare it with `git log -1 --format=%H origin/main`; equal means the deploy
landed. Do **not** use the hashed asset filenames under `/assets/` for this —
they change on every build by design.

Check it against the production domain (`map4-sale.vercel.app`), not the
`…-git-<branch>-….vercel.app` alias: that alias points at a separate branch
deployment and will report a different commit.

## 5. Create the first admin
- Supabase → **Authentication → Users → Add user** (email + password; tick
  "Auto Confirm User" so they can log in immediately).
- Promote them in **SQL Editor**:
  ```sql
  update public.profiles set role = 'admin' where email = 'admin@yourcompany.vn';
  ```
- Log in to the app with that account → you now see **Quản trị** (admin).
  Sales accounts are created from **Quản trị → Tài khoản Sale** (which triggers
  a password-setup email).

## 6. (Recommended) Configure email/SMTP
`create-user` sends a password-setup invite via Supabase's built-in mailer,
which is **rate-limited (~3–4/hour)** and may land in spam. For reliable
account-creation emails, set up custom SMTP in **Authentication → Emails → SMTP**
(any provider: Resend, SendGrid, Amazon SES, your Google Workspace, …).

## 7. Turn on the weekly automated backup
- Supabase → **Project Settings → Database → Connection string → URI** — copy the
  `postgresql://…` value.
- GitHub repo → **Settings → Secrets and variables → Actions → New repository
  secret** → name `SUPABASE_DB_URL`, value = that URI.
- GitHub **Actions** tab → *Weekly database backup* → **Run workflow** to test it,
  then download the `db-backup` artifact to confirm.
- ⚠️ **Keep this repository private** — backup artifacts contain the full database.

## 8. Turn on the 30-day activity purge
The **Hoạt động nhân viên** screen tells staff their activity is kept for 30 days;
this workflow is what makes that true.

- It uses the **same `SUPABASE_DB_URL` secret** as step 7 — if you did that step,
  there is nothing to add here.
- GitHub **Actions** tab → *Purge old activity data* → **Run workflow** to test it.
  It runs daily at 01:20 giờ Việt Nam thereafter.
- It deletes `activity_events` and "Mở lại" rows older than 30 days. Password
  sign-ins are kept indefinitely as the security audit trail.
- ⚠️ GitHub disables scheduled workflows after **60 days without repo activity**.
  If the repo goes quiet, re-enable it from the Actions tab, or the purge stops
  silently while the app keeps promising 30-day retention.

---

## Go-live verification checklist
Once steps 1–5 are done, confirm the live system end-to-end:

- [ ] App loads **without** the DEMO badge and requires login.
- [ ] Admin logs in and sees **Quản trị**.
- [ ] **Add a university** (set coordinates by clicking the mini-map, upload a
      logo + a photo) → saves without error → confirms Storage upload + admin RLS write.
- [ ] The new school appears as a **map marker** (with its name label) and in the
      **docked list**; opening it shows the photo gallery.
- [ ] **Create a sale account** → the invite email arrives (see step 6).
- [ ] Log in as that sale user → a row appears in **Quản trị → Nhật ký đăng nhập**
      with city/country (real IP; localhost shows blank — that's expected).
- [ ] As that sale user, **Đổi mật khẩu** in the header: a wrong current password
      is rejected without logging them out, a correct change succeeds, and the
      new password works on the next sign-in.
- [ ] **Quản trị → Sao lưu → Tải bản sao lưu** downloads a `.json` of live data.
- [ ] Switch to **Đài Loan**, add a Taiwanese school in **Quản trị** (Quốc gia =
      Đài Loan), and confirm it appears on the Taiwan map only; then edit a
      Korean school and save, to confirm `0007` is in place.
- [ ] As that sale user, open a few schools and run a search; then in
      **Quản trị → Hoạt động nhân viên** (7 ngày) their row shows a recent
      "Lần truy cập gần nhất" and a non-zero "Số thao tác", with the actions
      listed in the drill-down below.

## Rolling back
Removing the two `VITE_SUPABASE_*` env vars in Vercel and redeploying returns the
app to demo mode (bundled sample data, no login) — handy for demos.
