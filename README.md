# WolfTune 🐺🎵

Music rating and guessing app. Discover, rate, review, and prove your ear.

> **Phase 1 ✅** — project foundation, theme, mascot, and navigation shell.
> **Phase 2 ✅ (code)** — Supabase auth (email + password) + database schema.
> Follow the setup steps below to activate auth with your own keys.

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
3. Put them in `.env.local`:
   ```bash
   npm run dev    # or restart it
   ```

### 2. Run the database migration

Open **Supabase Dashboard → SQL Editor**, paste the contents of
[`supabase/migrations/20260903_initial_schema.sql`](supabase/migrations/20260903_initial_schema.sql),
and click **Run**. This creates `profiles`, `ratings`, `game_scores`
(with row-level security + an automatic profile trigger on signup).

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
├── components/
│   ├── auth/       # LoginForm (email sign-in / sign-up)
│   ├── Navbar.tsx  # server component (loads session)
│   ├── MobileMenu.tsx
│   ├── AuthButton.tsx
│   ├── Footer.tsx
│   └── WolfMascot.tsx
├── lib/
│   ├── supabase/   # client, server, middleware session refresh, env validation
│   ├── spotify.ts
│   └── utils.ts
├── middleware.ts   # session cookie refresh on every request
└── types/          # Spotify + Supabase (Database) data models
```

## Roadmap

- [x] **Phase 1** — Project init, theme, mascot, layout shell
- [x] **Phase 2** — Supabase auth (email + password) + database schema
- [ ] **Phase 3** — Spotify search, previews, ratings & reviews
- [ ] **Phase 4** — Guess-the-song game, streaks, leaderboard
- [ ] **Phase 5** — Community feed & social features