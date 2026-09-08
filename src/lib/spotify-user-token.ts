import "server-only";
import { createClient } from "@/lib/supabase/server";
import { resolveSpotifyCredentials } from "@/lib/spotify-credentials";
import { Database } from "@/types/database";

type Tables = Database["public"]["Tables"];
type SpotifyTokenRow = Tables["spotify_tokens"]["Row"];

interface TokenResponse {
  access_token: string;
  token_type?: string;
  expires_in: number;
  scope?: string;
  refresh_token?: string;
}

/** Minimum 60s safety margin so tokens aren't used on the edge of expiry. */
const EXPIRY_MARGIN_SECONDS = 60;

/**
 * In-memory cache of the *access token* (not the refresh token) per user.
 * Access tokens expire, refresh tokens are long-lived. Cache invalidates on restart.
 */
const accessTokenCache = new Map<string, { token: string; expiresAt: number }>();

/**
 * Returns the user's stored OAuth refresh token, or null if they haven't connected.
 */
async function getUserRefreshToken(serverSupabase: ReturnType<typeof createClient>, userId: string): Promise<SpotifyTokenRow | null> {
  const { data, error } = await serverSupabase
    .from("spotify_tokens")
    .select("refresh_token, scope, expires_at, created_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as SpotifyTokenRow;
}

/**
 * Saves or updates the user's refresh token immediately after OAuth completes.
 */
export async function saveSpotifyRefreshToken(userId: string, refreshToken: string, scope?: string) {
  const serverSupabase = createClient();
  const { error } = await serverSupabase
    .from("spotify_tokens")
    .upsert({
      user_id: userId,
      refresh_token: refreshToken,
      scope: scope ?? null,
      expires_at: null, // will be set when we first use it
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error("[spotify-oauth] Failed to save refresh token:", error.message);
    throw error;
  }
}

/**
 * Removes the user's stored refresh token (disconnect flow).
 */
export async function removeSpotifyRefreshToken(userId: string) {
  const serverSupabase = createClient();
  const { error } = await serverSupabase
    .from("spotify_tokens")
    .delete()
    .eq("user_id", userId);

  if (error) {
    console.error("[spotify-oauth] Failed to remove refresh token:", error.message);
  }
}

/**
 * Checks if the user has a stored refresh token.
 */
export async function hasSpotifyToken(userId: string): Promise<boolean> {
  const token = await getUserRefreshToken(createClient(), userId);
  return token !== null;
}

/**
 * Exchanges a refresh token for a fresh access token using the credentials
 * from the user's profile (their own app, which issued the token).
 *
 * If the user has personal Spotify credentials saved in their profile, those
 * are used as the client ID/Secret. Otherwise, we fall back to the server's
 * SPOTIFY_CLIENT_ID/SECRET env vars (which must be set if any users lack
 * personal credentials).
 */
async function exchangeRefreshToken(refreshToken: string, userId: string): Promise<TokenResponse> {
  // Refreshing must use the SAME client id/secret pair that originally issued
  // the refresh token. resolveSpotifyCredentials mirrors the priority used by
  // /auth/spotify-connect (personal → group → env), so tokens obtained via
  // inherited group credentials can be refreshed too.
  const { credentials } = await resolveSpotifyCredentials();
  if (!credentials) {
    throw new Error("No Spotify credentials found — add personal credentials in Settings or join a group that has them.");
  }
  const clientId = credentials.clientId;
  const clientSecret = credentials.clientSecret;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = (await res.text()).slice(0, 200);
    throw new Error(`Spotify refresh failed: ${res.status} ${txt}`);
  }

  return (await res.json()) as TokenResponse;
}

/**
 * Gets a valid access token for the given user, refreshing if necessary.
 * Uses the user's own credentials (from their profile or env) to refresh
 * their personal OAuth token.
 */
export async function getUserAccessToken(userId: string): Promise<string | null> {
  // Check in-memory cache first
  const cached = accessTokenCache.get(userId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.token;
  }

  const serverSupabase = createClient();
  const tokenRow = await getUserRefreshToken(serverSupabase, userId);

  if (!tokenRow?.refresh_token) {
    return null;
  }

  try {
    const tokenData = await exchangeRefreshToken(tokenRow.refresh_token, userId);

    if (tokenData.refresh_token) {
      // Spotify issued a new refresh token — store it
      await saveSpotifyRefreshToken(userId, tokenData.refresh_token, tokenData.scope);
    }

    const expiresAt = Date.now() + tokenData.expires_in * 1000 - EXPIRY_MARGIN_SECONDS * 1000;
    accessTokenCache.set(userId, { token: tokenData.access_token, expiresAt });

    return tokenData.access_token;
  } catch (e) {
    console.error("[spotify-oauth] Token refresh failed:", (e as Error).message);
    accessTokenCache.delete(userId);
    throw e;
  }
}

/**
 * Clears the cached access token for a user (call on disconnect).
 */
export function clearCachedAccessToken(userId: string) {
  accessTokenCache.delete(userId);
}
