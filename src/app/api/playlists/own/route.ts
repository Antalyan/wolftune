import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listOwnPlaylists } from "@/lib/spotify";
import { getUserAccessToken } from "@/lib/spotify-user-token";
import type { SpotifyPlaylistSummary } from "@/types/spotify";

/**
 * Lists the signed-in user's own playlists (owner or co-creator), fetched with
 * the user's personal OAuth access token. This is the only reliable way to
 * read playlist contents in dev mode: the request runs as the playlist owner.
 */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let accessToken: string | null = null;
  try {
    accessToken = await getUserAccessToken(user.id);
  } catch (err) {
    console.error("[own-playlists] token error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      {
        error:
          "Your Spotify connection is out of date. Reconnect Spotify in Settings to refresh it.",
        code: "TOKEN_REFRESH_FAILED",
      },
      { status: 502 }
    );
  }

  if (!accessToken) {
    return NextResponse.json(
      {
        error: "Connect Spotify in Settings to see your playlists.",
        code: "NOT_CONNECTED",
      },
      { status: 403 }
    );
  }

  try {
    const playlists: SpotifyPlaylistSummary[] = await listOwnPlaylists(accessToken);
    return NextResponse.json({ playlists });
  } catch (err) {
    console.error("[own-playlists] fetch error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Could not load your playlists — try again in a moment." },
      { status: 502 }
    );
  }
}
