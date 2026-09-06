import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPlaylistWithTracks, SpotifyApiError } from "@/lib/spotify";
import { getUserAccessToken } from "@/lib/spotify-user-token";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Playlist contents (/playlists/{id}/tracks) REQUIRE a user OAuth token — the
  // Client Credentials token cannot access this endpoint (403). Require it.
  const userAccessToken = user ? await getUserAccessToken(user.id) : null;

  console.log("[spotify-debug] /api/playlists/[id]:", { userId: user?.id ?? null, hasToken: !!userAccessToken });

  if (!userAccessToken) {
    return NextResponse.json(
      {
        error: "Connect Spotify in Settings to view playlist contents.",
        code: "NOT_CONNECTED",
      },
      { status: 403 }
    );
  }

  try {
    const result = await getPlaylistWithTracks(params.id, undefined, userAccessToken);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SpotifyApiError)
      return NextResponse.json({ error: error.message }, { status: error.status ?? 502 });
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
