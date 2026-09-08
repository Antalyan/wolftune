import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveSiteUrl } from "@/lib/site-url";
import { saveSpotifyRefreshToken, clearCachedAccessToken } from "@/lib/spotify-user-token";

/**
 * OAuth callback for the per-user Spotify flow.
 * 1. Validates the CSRF state (httpOnly cookie set by /auth/spotify-connect).
 * 2. Exchanges the code using the USER'S OWN credentials (from their profile) —
 *    the same app that started the flow must finish it.
 * 3. Stores the refresh token (server-only, RLS-protected) and redirects back
 *    to Settings with a status flag.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const spotifyError = url.searchParams.get("error");

  const origin = resolveSiteUrl(request);

  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/settings?spotify=error&reason=${encodeURIComponent(reason)}`, origin));

  if (spotifyError) return fail(spotifyError);
  if (!code || !state) return fail("missing_params");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", origin));

  // CSRF check: state must match the cookie from the connect step.
  const cookieState = (await import("next/headers")).cookies().get("spotify_oauth_state")?.value;
  if (!cookieState || cookieState !== state) return fail("state_mismatch");

  const { data: profile } = await supabase
    .from("profiles")
    .select("spotify_client_id, spotify_client_secret")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.spotify_client_id || !profile.spotify_client_secret) {
    return NextResponse.redirect(new URL("/settings?spotify=need_credentials", origin));
  }

  // The redirect_uri must be byte-identical to the one used in /auth/spotify-connect.
  const redirectUri = `${origin}/auth/spotify-callback`;

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: profile.spotify_client_id,
      client_secret: profile.spotify_client_secret,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = (await res.text()).slice(0, 200);
    console.error("[spotify-callback] token exchange failed:", res.status, txt);
    return fail(`exchange_${res.status}`);
  }

  const token = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    scope?: string;
    expires_in: number;
  };

  // Spotify only returns a refresh token on the first authorization (unless
  // show_dialog=true). If absent, keep the previously stored one.
  if (token.refresh_token) {
    await saveSpotifyRefreshToken(user.id, token.refresh_token, token.scope);
  } else {
    // No new refresh token — the old one stays valid, just clear the cache
    // so the next request refreshes with the fresh scope.
    clearCachedAccessToken(user.id);
  }

  const redirect = NextResponse.redirect(new URL("/settings?spotify=connected", origin));
  redirect.cookies.delete("spotify_oauth_state");
  return redirect;
}
