import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SPOTIFY_SCOPES } from "@/lib/spotify-connect";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("spotify_client_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.spotify_client_id) {
    return NextResponse.redirect(new URL("/settings?spotify=need_credentials", request.url));
  }

  const state = crypto.randomUUID();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";
  const redirectUri = `${origin}/auth/spotify-callback`;

  const params = new URLSearchParams({
    client_id: profile.spotify_client_id,
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
