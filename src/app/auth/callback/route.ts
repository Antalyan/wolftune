import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { saveSpotifyRefreshToken } from "@/lib/spotify-user-token";

/**
 * Auth callback handler.
 *
 * Supabase redirects here with a `?code=` query param after an email
 * confirmation link (or any OAuth flow). We exchange it for a session, then
 * redirect onward.
 *
 * For Spotify OAuth, we also persist the refresh token so we can use it
 * later for playlist access (which requires user-scoped tokens).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      // Persist refresh token if this was a Spotify OAuth flow
      const refreshToken = data.session.provider_refresh_token;
      const provider = data.session.user?.app_metadata?.provider;

      if (provider === "spotify" && refreshToken && data.session.user) {
        try {
          await saveSpotifyRefreshToken(data.session.user.id, refreshToken, data.session.user.app_metadata?.scopes);
        } catch (saveError) {
          console.error("[spotify-oauth] Failed to save refresh token:", (saveError as Error).message);
          // Don't block the redirect — the user is still logged in
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return to the login page with an error indicator instead of a raw 400.
  return NextResponse.redirect(`${origin}/auth/login?error=callback_failed`);
}