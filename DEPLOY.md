# MediKiosk — Vercel + Supabase Deployment Guide

## What was fixed for deployment

| # | Problem | Fix |
|---|---------|-----|
| 1 | Custom Express server (`server.ts`) can't run on Vercel serverless | Added `/api/*` serverless functions mirroring every Express route |
| 2 | Patient data in `data/patients.json` / memory is wiped on Vercel | Supabase-primary store (`api/_lib/store.ts`) with memory fallback |
| 3 | `supabase-js` installed but never used | Backend uses it server-side; added Storage upload helper client-side |
| 4 | Gemini model name outdated | Now `GEMINI_MODEL` env, default `gemini-3.8-flash` (verified live) |
| 5 | `/api/check-interactions` existed but no UI called it | Doctor dashboard now has **Check Interactions** button + alerts |
| 6 | `respiratoryRate` referenced in print view but missing from types | Added to `VitalSigns` |
| 7 | Document scans stored as giant base64 strings in DB rows | Optional Supabase Storage bucket `medical-documents` with fallback |
| 8 | `VITE_SUPABASE_*` vs `SUPABASE_*` env mismatch | Documented + supported both (see `.env.example`) |
| 9 | `vite build` also bundled the server (breaks Vercel) | `build` = frontend only; `build:server` = old behavior for VPS |

## Deploy steps

### 1. Supabase setup (5 min)
1. Create a project at https://supabase.com/dashboard
2. Open **SQL Editor** → paste + run **`supabase/schema.sql`**
3. Go to **Settings → API**, copy:
   - Project URL → `SUPABASE_URL` / `VITE_SUPABASE_URL`
   - `anon public` key → `SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server only)

### 2. Gemini key (2 min, optional but recommended)
- Get a key at https://aistudio.google.com/apikey → `GEMINI_API_KEY`
- Without it the app still works (rule-based fallback triage).

### 3. Vercel deploy
1. Push this folder to GitHub (project root = folder containing `package.json`).
2. Vercel → **Add New Project** → import the repo.
3. Framework preset: **Vite**. Build command `vite build`, output `dist` (already in `vercel.json`).
4. **Environment Variables** (Production + Preview):
   - `GEMINI_API_KEY` = your key (server only)
   - `SUPABASE_URL` = same as `VITE_SUPABASE_URL`
   - `SUPABASE_ANON_KEY` = same as `VITE_SUPABASE_ANON_KEY`
   - `VITE_SUPABASE_URL` = Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = Supabase anon/publishable key
   - `SUPABASE_SERVICE_ROLE_KEY` = service_role key (recommended — lets `/api` bypass RLS for kiosk writes and verify staff PINs)
   - `STAFF_SESSION_SECRET` = random 32-byte hex for signing doctor tokens: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - `ALLOW_DOCTOR_SELF_REGISTER` = `false` in production (pre-provision doctors via `schema.sql`); keep `true` for pilot/demo
5. **Deploy**. Verify `https://<app>.vercel.app/api/health` returns `{"status":"ok",...}`.

### Doctor Portal auth (how it works)
- Doctors sign in with **registration number + PIN** (demo PIN `1234` — change after first login).
- PINs are stored as SHA-256 hashes; the server verifies and issues a 12-hour signed session token.
- Staff-only endpoints (`PATCH status/annotate`, `DELETE queue`, `POST check-interactions`) require the token; kiosk endpoints stay public by design.
- Expired/invalid tokens force a re-login automatically.

### 4. Local development (unchanged)
```bash
npm install
cp .env.example .env   # fill in keys
npm run dev            # Express (server.ts) on :3000 + Vite proxy
```

## Project structure (post-fix)
- `server.ts` — local-dev Express server (file/memory store)
- `api/_lib/store.ts` — shared Supabase/memory store + Gemini helper (used by Vercel)
- `api/patients/*`, `api/health.ts`, `api/emergency-alert.ts`, `api/chat/*`, `api/check-interactions.ts`, `api/documents/analyze.ts` — serverless routes
- `supabase/schema.sql` — run once in Supabase
- `src/` — React kiosk + doctor dashboard (calls same `/api` paths locally and on Vercel)

## Android app (PWA + Play Store TWA)

The project is an installable PWA out of the box:

- `public/manifest.webmanifest` — name, icons (192/512 + maskable), theme color, shortcuts for Intake and Doctor Portal
- `public/icons/` — generated via `npm run generate-icons` (no dependencies, pure Node)
- `public/sw.js` — offline app shell for kiosk tablets; **`/api/*` is never cached** (live patient data)
- `index.html` — manifest link, theme-color, iOS touch icons; `src/main.tsx` registers the worker in production

**Option A — install directly (no store, best for hospital-owned tablets):**
1. Deploy to Vercel (HTTPS is required).
2. On the Android tablet open Chrome → your Vercel URL → ⋮ menu → **Install app / Add to Home screen**.
3. The kiosk runs fullscreen standalone with offline shell support.

**Option B — publish on Google Play as a TWA (Trusted Web Activity):**
1. Deploy first, then on any machine with Node + JDK 17:
   ```bash
   npm i -g @bubblewrap/cli
   bubblewrap init --manifest https://<your-app>.vercel.app/manifest.webmanifest
   ```
   Accept defaults (package `app.medikiosk.twa` matches the included `assetlinks.json`).
2. `bubblewrap build` → produces `app-release-signed.aab`.
3. Get the SHA-256 cert fingerprint: `bubblewrap fingerprint` (or Play Console → Setup → App integrity → App signing key).
4. Paste it into `public/.well-known/assetlinks.json` replacing `REPLACE_WITH_PLAY_SIGNING_SHA256`, redeploy, then upload the `.aab` to Play Console.
5. Until the fingerprint is in place the app still works — it just shows a browser address bar instead of full trusted fullscreen.
