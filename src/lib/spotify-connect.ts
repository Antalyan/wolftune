import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Per-user Spotify OAuth connection.
 *
 * We connect each user to Spotify through THEIR OWN registered app (the same
 * Client ID/Secret they save in Settings). This gives each user their own
 * quota (no shared 5/25-user dev-mode limit) and never routes login through a
 * global provider. The user only sees playlists they own or co-create, which is
 * exactly what Spotify's API returns for their own account.
 */

/** Scopes required to read the user's own + shared-with-them playlists. */
export const SPOTIFY_SCOPES =
  "playlist-read-private playlist-read-collaborative user-read-email streaming user-read-playback-state user-modify-playback-state";

/** Spotify authorization + token endpoints. */
const AUTHORIZE_URL = "https://accounts.spotify.com/authorize";
const TOKEN_URL = "https://accounts.spotify.com/api/token";

interface Credentials {
  clientId: string;
  clientSecret: string;
}

/**
 * Returns the user's OWN Spotify app credentials (from their profile), falling
 * back to env vars only for backward compat. Throws if none are available.
 */
export async function getOwnSpotifyCredentials(
  userId: string
): Promise<Credentials> {
  const supabase = createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("spotify_client_id, spotify_client_secret")
    .eq("id", userId)
    .single();

  if (profile?.spotify_client_id && profile?.spotify_client_secret) {
    return {
      clientId: profile.spotify_client_id,
      clientSecret: profile.spotify_client_secret,
    };
  }

  if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
    return {
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    };
  }

  throw new Error(
    "Add your Spotify Client ID and Client Secret in Settings before connecting."
  );
}

/** Builds the Spotify authorization URL for the given user's own app. */
export function buildSpotifyAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const q = new URLSearchParams({
    response_type: "code",
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    scope: SPOTIFY_SCOPES,
    state: params.state,
  });
  return `${AUTHORIZE_URL}?${q.toString()}`;
}

interface TokenResponse {
  access_token: string;
  token_type?: string;
  expires_in: number;
  scope?: string;
  refresh_token?: string;
}

/**
 * Exchanges the OAuth authorization `code` for tokens using the user's OWN
 * app credentials (the app that issued the code).
 */
export async function exchangeSpotifyCode(params: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: params.clientId,
    client_secret: params.clientSecret,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = (await res.text()).slice(0, 200);
    throw new Error(`Spotify authorization failed: ${res.status} ${txt}`);
  }

  return (await res.json()) as TokenResponse;
}
