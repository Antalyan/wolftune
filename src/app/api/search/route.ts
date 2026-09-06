import { NextResponse } from "next/server";
import {
  getMockSearch,
  listOwnPlaylists,
  searchSpotify,
  SpotifyApiError,
} from "@/lib/spotify";
import { resolveSpotifyCredentials } from "@/lib/spotify-credentials";
import { getUserAccessToken } from "@/lib/spotify-user-token";
import { createClient } from "@/lib/supabase/server";
import {
  SpotifyAlbumSummary,
  SpotifyPlaylistSummary,
  SpotifySearchType,
  SpotifyTrack,
} from "@/types/spotify";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set<SpotifySearchType>(["track", "album", "playlist"]);
const MAX_QUERY_LENGTH = 80;
/** Max results per search request — Spotify dev-mode apps cap this at 10. */
const RESULT_LIMIT = 10;

/**
 * Server-side search proxy — keeps SPOTIFY_CLIENT_SECRET on the server and
 * lets the client fetch normalized results via /api/search?q=...&types=...
 * Falls back to the offline mock catalog when no credentials are configured.
 *
 * Playlists are NOT searched publicly (Client Credentials cannot return the
 * user's own/collaborative playlists). Instead, playlists come from the
 * signed-in user's own account via their OAuth token (/me/playlists).
 * Albums and tracks are searched publicly as usual.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();
  const types = searchParams
    .get("types")
    ?.split(",")
    .map((t) => t.trim())
    .filter((t): t is SpotifySearchType => ALLOWED_TYPES.has(t as SpotifySearchType));

  if (!query) {
    return NextResponse.json({ error: "Query parameter 'q' is required." }, { status: 400 });
  }
  if (query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { error: `Query too long (max ${MAX_QUERY_LENGTH} characters).` },
      { status: 400 }
    );
  }

  const resolvedTypes: SpotifySearchType[] =
    types && types.length > 0 ? types : ["track", "album", "playlist"];

  // Public search covers only tracks and albums — NOT playlists.
  const publicTypes = resolvedTypes.filter((t) => t !== "playlist");

  // Resolve credentials (user → group → env)
  const { credentials, missingReason } = await resolveSpotifyCredentials();

  // Get current user for own-playlist search
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get user's OAuth token (if they've connected Spotify) for own playlists
  let userAccessToken: string | null = null;
  if (user && resolvedTypes.includes("playlist")) {
    try {
      userAccessToken = await getUserAccessToken(user.id);
    } catch {
      // Token refresh failed — own playlists won't appear, but other results still do
    }
  }

  // No credentials and no user token — return mock catalog (no playlists)
  if (!credentials && !userAccessToken) {
    const mockResults = getMockSearch(query, publicTypes);
    return NextResponse.json({
      ...mockResults,
      playlists: [],
      missingReason,
    });
  }

  try {
    // Search tracks + albums publicly (Client Credentials)
    let tracks: SpotifyTrack[] = [];
    let albums: SpotifyAlbumSummary[] = [];
    if (publicTypes.length > 0 && credentials) {
      const results = await searchSpotify(query, {
        types: publicTypes,
        limit: RESULT_LIMIT,
        credentials,
      });
      tracks = results.tracks;
      albums = results.albums;
    }

    // Search the user's own playlists (owner + collaborative) via OAuth
    let playlists: SpotifyPlaylistSummary[] = [];
    if (resolvedTypes.includes("playlist") && userAccessToken) {
      const ownPlaylists = await listOwnPlaylists(userAccessToken);
      const q = query.toLowerCase();
      playlists = ownPlaylists.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.owner_name.toLowerCase().includes(q) ||
          Boolean(p.description?.toLowerCase().includes(q))
      );
    }

    return NextResponse.json({
      tracks,
      albums,
      playlists,
      source: "spotify",
      credentialStatus: "ok",
      credentialSource: credentials?.source ?? null,
      groupName: credentials?.groupName ?? null,
    });
  } catch (error) {
    if (error instanceof SpotifyApiError) {
      // Tell the user WHERE the bad credentials live so they can fix them.
      if (error.message.includes("invalid_client")) {
        const hint =
          credentials?.source === "user"
            ? "Your personal Spotify credentials are invalid — update them in Settings."
            : credentials?.source === "group"
              ? `The Spotify credentials of your group${credentials?.groupName ? ` "${credentials.groupName}"` : ""} are invalid — ask the group owner to fix them.`
              : "The server's default Spotify credentials are invalid — contact the administrator.";
        return NextResponse.json({ error: hint }, { status: 502 });
      }
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    return NextResponse.json({ error: "Unexpected error while searching Spotify." }, { status: 500 });
  }
}
