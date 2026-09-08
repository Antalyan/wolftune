import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SPOTIFY_SCOPES } from "@/lib/spotify-connect";
import { resolveSpotifyCredentials } from "@/lib/spotify-credentials";
import { resolveSiteUrl } from "@/lib/site-url";

/**
 * Starts the per-user Spotify OAuth flow:
 * builds the authorize URL using the USER'S OWN Spotify app credentials
 * (from their profile), stores a CSRF state in an httpOnly cookie, and
 * redirects the browser to Spotify's consent screen.
 */
export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // OAuth may be started with ANY available credentials — personal, inherited
  // group credentials, or env vars. The refresh flow uses the same priority
  // (see spotify-user-token), so group-credential users can connect too.
  const { credentials } = await resolveSpotifyCredentials();

  if (!credentials) {
    return NextResponse.redirect(new URL("/settings?spotify=need_credentials", request.url));
  }

  const state = crypto.randomUUID();
  const origin = resolveSiteUrl(request);
  const redirectUri = `${origin}/auth/spotify-callback`;

  const params = new URLSearchParams({
    client_id: credentials.clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    state,
    scope: SPOTIFY_SCOPES,
    show_dialog: "false",
  });

  const res = NextResponse.redirect(
    `https://accounts.spotify.com/authorize?${params.toString()}`
  );
  // httpOnly cookie so the state can't be forged client-side; expires with the flow.
  res.cookies.set("spotify_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
