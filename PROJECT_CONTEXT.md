# WolfTune — Project Context

Fast reference for contributors/agents working on WolfTune. For setup instructions see
[`README.md`](README.md); this file focuses on **what the app does and how it is structured**.

## What WolfTune Is

A music rating & guessing web app on top of the Spotify Web API. Users connect their own
Spotify developer app (per-user OAuth), browse/search music, rate tracks/albums/playlists
(1–10 per track + subjective overall score with notes), and play an adaptive guessing game
over their own playlists. Groups let users share Spotify credentials and compare ratings.

## Key Features

| Feature | Where | Notes |
|---|---|---|
| Search & Rate | `src/app/search/` | Public catalog search (tracks + albums) via Client Credentials; full-track playback via Spotify embed iframe; per-track + subjective ratings. |
| Own Playlists | `src/app/playlists/[id]/`, `src/app/rate/` | Only playlists the user owns or co-creates (via user OAuth token). `/playlists/{id}/tracks` requires user OAuth — Client Credentials gets 403. |
| Rate flow | `src/app/rate/`, `src/components/RatingForm.tsx` | Snapshots catalog into Supabase (`music_*` tables) so ratings have stable FK targets. |
| Adaptive Guessing Game | `src/app/game/`, `src/lib/game.ts` | See "Guessing Game" below. |
| Groups | `src/app/groups/`, `src/lib/groups.ts` | Invite-code groups; optional shared Spotify credentials; member ratings + leaderboards. |
| Statistics | `src/app/stats/`, `src/lib/stats.ts` | Aggregates over ratings; guessing stats enable "hardest song/author". |

## Guessing Game (Phase 7)

- User picks **one of their playlists** (own or collaborative) → one session per playlist,
  infinite rounds until "End Game".
- **Weighted picker** (`weightedPick` in `src/lib/game.ts`): selection probability =
  track difficulty.
- **Per-user difficulty** (`user_track_difficulty`): starts at **2**, minimum **1**,
  +1 on "both wrong", rules in `evaluateRound`:
  - both correct → 1 (or −1 if > 2)
  - one correct → −1, floor 1 (stays at 2 when coming from 2)
  - both wrong → +1
- **Modes**:
  - *Type & Match* — text inputs for song + artist, fuzzy matching:
    - `fuzzyMatch` — Levenshtein tolerance ≈ 30 % of length (min 2)
    - `matchesArtist` — any of the track's artists, and single-name tokens
      (surname alone suffices)
  - *Self-Assessment* — listen → reveal → self-report song/artist knowledge.
- **User override modal** after each round: adjust song/artist correctness and the
  difficulty slider before anything is persisted.
- **Persistence** (`user_track_stats`, `increment_track_stats` RPC): per-user/track
  correct/incorrect counts → statistics (hardest song/author). Session stats are client-side.
- **Playback** (`src/components/SpotifyPlayerProvider.tsx`):
  - Full-track playback via the **Web Playback SDK**. Starting a track must go through
    the Web API `PUT /me/player/play?device_id=...` (`playSnippet`) — the SDK's own
    `pause/resume/seek` can only control already-loaded playback.
  - Requires the OAuth scopes `streaming`, `user-read-playback-state`,
    `user-modify-playback-state` (see `SPOTIFY_SCOPES` in `src/lib/spotify-connect.ts`) —
    users must **reconnect** Spotify when scopes change.
  - Requires **Spotify Premium** + the user signed into Spotify in the browser.
  - Fallback: 30-second `preview_url` via native `HTMLAudioElement` (often `null` in
    Spotify's API responses).
- **Pause/Resume** toggle works for both audio sources.

## Architecture Notes (things that bite)

- **Supabase types are hand-maintained** in `src/types/database.ts` — when adding a
  migration, add matching table/function types there or `tsc --noEmit` fails.
- **Spotify OAuth is custom** (`/auth/spotify-connect` → `/auth/spotify-callback`),
  storing refresh tokens in `spotify_tokens`. `session.provider_token` is NOT used.
  `GET /api/spotify/sdk-token` returns a fresh access token for the Web Playback SDK.
- `redirect_uri` used in OAuth = `{origin}/auth/spotify-callback`; in dev Spotify
  rejects `localhost`, so use `http://127.0.0.1:3000` everywhere.
- Playlist `/items` responses nest the track under `item` (not `track`), and pagination
  `next` links are absolute URLs — pass them through as-is (see `getPlaylistWithTracks`).
- Client Credentials token **cannot** read `/playlists/{id}/tracks` (403) — user OAuth is
  mandatory there.

## Migrations (`supabase/migrations/`, run in order)

1. `20260903_initial_schema.sql` — profiles + auto-create trigger
2. `20260903_phase3_data_model_v2.sql` — catalog snapshots + ratings
3. `20260903_phase3_groups_and_credentials.sql` — groups, memberships, credentials
4. `20260905_spotify_oauth_tokens.sql` — `spotify_tokens`
5. `20260906_guessing_game.sql` — `user_track_difficulty`, `user_track_stats`, RPC

## Useful Commands

```bash
npm run dev        # dev server (use http://127.0.0.1:3000)
npm run typecheck  # tsc --noEmit — run before committing
npm run lint       # next lint
npm run build      # production build (includes typecheck)
```
