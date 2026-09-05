# WolfTune 🐺🎵

Music rating and guessing app. Discover, rate, review, and prove your ear.

> **Phase 1 ✅** — project foundation, theme, mascot, and navigation shell.
> **Phase 2 ✅ (code)** — Supabase auth (email + password).
> **Phase 3 ✅ (code)** — Spotify foundation: server API client, data model v2, playback connect.
> Follow the setup steps below to activate auth and Spotify with your own keys.

## Tech Stack

- **Framework:** Next.js 14+ (App Router, TypeScript)
- **Styling:** Tailwind CSS, Lucide React icons
- **Backend & Database:** Supabase (`@supabase/ssr`, PostgreSQL)
- **Integrations:** Spotify Web API
- **Deployment:** Vercel

## Getting Started

### 1. Node version

Next.js 14 requires **Node ≥ 18.17** (use the 20.x LTS as pinned in [`.nvmrc`](.nvmrc)).

<details>
<summary>Windows upgrade options</summary>

**Chocolatey (simplest, if already installed):**

```powershell
choco upgrade nodejs-lts -y
```

**nvm-windows (for switching versions per project):**

```powershell
winget install CoreyButler.NVMForWindows
# then in a new admin terminal
nvm install 20
nvm use 20
```

Verify with `node -v` (should print `v20.x.x`).
</details>

### 2. Install dependencies

```bash
npm ci
```

### 3. Environment variables

Copy [`.env.example`](.env.example) to `.env.local` and fill in your keys:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key |
| `SPOTIFY_CLIENT_ID` | Spotify app client ID |
| `SPOTIFY_CLIENT_SECRET` | Spotify app client secret |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL (`http://localhost:3000` in dev) |

> Without Spotify keys the app falls back to a small built-in mock catalog so the UI still works.

### 4. Run

```bash
npm run dev   # http://localhost:3000
```

Useful scripts:

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Start the production server |
| `npm run lint` | ESLint (`next/core-web-vitals`) |
| `npm run typecheck` | TypeScript check without emitting |

## 🔐 Auth Setup (Supabase Email) — one-time, ~5 minutes

Phase 2 uses **Supabase Auth with email + password**. The code is in place; you only
need to connect your own Supabase project:

### 1. Create a Supabase project

1. Go to **https://supabase.com** → **New project** (takes ~2 minutes).
2. Note your **Project URL** and **anon key**:
   `Supabase Dashboard → Project Settings → API`.
3. Put them in `.env.local`.

### 2. Run the database migrations

Open **Supabase Dashboard → SQL Editor** and run, in order:

1. [`supabase/migrations/20260903_initial_schema.sql`](supabase/migrations/20260903_initial_schema.sql) —
   user profiles (auto-created on signup)
2. [`supabase/migrations/20260903_phase3_data_model_v2.sql`](supabase/migrations/20260903_phase3_data_model_v2.sql) —
   catalog snapshots + track ratings + subjective album/playlist ratings

### 3. Email provider (enabled by default)

`Supabase Dashboard → Authentication → Providers → Email` is **on by default** —
nothing to configure there.

**Confirm email** (`Dashboard → Authentication → Sign In / Up`):

- **Local development:** turn it **OFF** so sign-ups sign you in immediately.
- **Production:** turn it back **ON**, and configure custom SMTP under
  **Authentication → SMTP** (e.g. Resend, Postmark) — the built-in SMTP is
  dev-grade and rate-limited (~2 emails/hour on the free tier).

### 4. Configure the URL settings

`Supabase Dashboard → Authentication → URL Configuration`:

- **Site URL:** `http://localhost:3000` (your Vercel URL in production)
- **Redirect URLs**, add:
  ```
  http://localhost:3000/auth/callback
  ```

### 5. Test

Open `http://localhost:3000`, click **Sign In → Create an account**, and register
with your email + password.

- Confirmation **OFF**: you're signed in immediately (avatar + name in the navbar).
- Confirmation **ON**: click the link in your inbox — you'll land back in the app signed in.

> **Secure sign-out & callback** live at `/auth/signout` (POST) and `/auth/callback`
> (exchanges the confirmation code for a session). The `src/middleware.ts` refreshes
> the session cookie on every request.

## 🎧 Spotify Credentials — per-user or per-group

WolfTune searches the Spotify catalog server-side (**Client Credentials flow**) and
plays **30-second preview clips** (not full tracks). Search works with your own
credentials — or a shared set from a group.

> Why previews instead of full tracks? The Web Playback SDK requires Spotify
> Premium, and each user would need a Premium-linked OAuth token. Preview URLs are
> available on **every** track and work without login — they're perfect for search
> and the guessing game. Full-track playback can be added later as an optional
> enhancement via OAuth + Premium.

### Option A: Add your own credentials (Settings)

1. Go to **https://developer.spotify.com/dashboard** → **Create app**.
2. Note the **Client ID** and **Client Secret** (no Redirect URIs needed — we use
   the Client Credentials flow).
3. **Sign in** to WolfTune → visit **Settings** (nav link appears when signed in).
4. Paste your **Client ID** and **Client Secret** → click **Save credentials**.

### Option B: Use your group's credentials

If your group has shared credentials, they're used automatically — no action needed.
Group owners can set them at **Groups → [your group]**.

### Fallback: env vars (for local dev)

```env
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
```

When no user or group credentials are found, WolfTune falls back to these — great
for single-user local development.

### How credentials resolve (priority order)

1. **Your personal credentials** on your profile (Settings)
2. **Any group you belong to** that has credentials (first match)
3. **Server environment variables** (`.env.local`)

Without any of these, search shows a **"Demo data" mode** with a small built-in
catalog.

### 5. Test search

- Type a query → live Spotify results appear (no more "Demo data" pill).
- Click any track's **▶** button to play its 30-second preview.

### Security notes

- Client secrets are stored in Supabase and protected by **Row Level Security** —
  only you (or group owners, for shared creds) can read or update them.
- Search requests go through our server (`/api/search`) — your Client Secret **never
  touches the browser**.
- The 30-second previews are public Spotify snippets — no user auth token involved.

## 🛠️ Troubleshooting

**`EPERM: operation not permitted ... .next\trace` on start (Windows)**
Two Next.js instances (e.g. a dev server plus a production build) are writing to
`.next` at the same time. Stop the other instance, delete `.next`, and start again:

```powershell
# stop all node processes for this project, then:
Remove-Item -Recurse -Force .next
npm run dev
```

**`Spotify rejected the credentials (invalid_client)` / search fails with status 400/502**
The Client ID/Secret being used are wrong. The error tells you where they live:
- *"Your personal Spotify credentials are invalid"* → fix them in **Settings**.
- *"The Spotify credentials of your group ... are invalid"* → the group owner must
  fix them on the group page.
- *"server's default Spotify credentials"* → fix `SPOTIFY_CLIENT_ID/SECRET` in
  `.env.local` and restart.
Common causes: copied the Client Secret with extra characters, or the Spotify app
was deleted/reset in the dashboard.

**Other errors**
- Build fails with a `.next` lock after a crash → delete `.next` and retry.
- "Demo data" pill → no credentials resolved (see resolution order above).

## Theme

Dark-first design system:

- Background `#090d16`, zinc text scale
- Accent **WolfTune Blue** (`wolf.*` palette in `tailwind.config.ts`)
- Accent **Spotify Green** (`spotify.*` palette)
- Custom SVG **blue wolf mascot** (`src/components/WolfMascot.tsx`) with 4 moods: `listening`, `howling`, `cool`, `happy`
- Keyboard-friendly focus rings, `prefers-reduced-motion` support

## Project Structure

```
src/
├── app/            # App Router pages, root layout, auth callback/signout routes
│   └── api/        # Server routes (search, albums, playlists, spotify me)
├── components/
│   ├── auth/       # LoginForm (email sign-in / sign-up)
│   ├── Navbar.tsx  # server component (loads session)
│   ├── MobileMenu.tsx
│   ├── AuthButton.tsx
│   ├── SpotifyConnectionCard.tsx
│   ├── SpotifyPlayerProvider.tsx  # Web Playback SDK context
│   ├── Footer.tsx
│   └── WolfMascot.tsx
├── lib/
│   ├── supabase/   # client, server, middleware session refresh, env validation
│   ├── spotify.ts  # server-only Web API client (cached token)
│   └── utils.ts
├── middleware.ts   # session cookie refresh on every request
└── types/          # Spotify + Supabase (Database) data models
```

## Roadmap

- [x] **Phase 1** — Project init, theme, mascot, layout shell
- [x] **Phase 2** — Supabase auth (email + password) + database schema
- [x] **Phase 3** — Spotify foundation: server API client, data model v2, playback connect
- [ ] **Phase 4** — Rating experience: per-track + subjective album/playlist ratings
- [ ] **Phase 5** — Groups: create, invite, see group members' ratings
- [ ] **Phase 6** — Group statistics: graphs, preferences, best-of lists
- [ ] **Phase 7** — Guessing game: weighted difficulty, snippet playback, streaks
- [ ] **Phase 8** — Polish, deployment, community feed