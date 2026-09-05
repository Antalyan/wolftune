import { NextResponse } from "next/server";
import {
  getMockSearch,
  searchSpotify,
  SpotifyApiError,
} from "@/lib/spotify";
import { resolveSpotifyCredentials } from "@/lib/spotify-credentials";
import { SpotifySearchType } from "@/types/spotify";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set<SpotifySearchType>(["track", "album", "playlist"]);
const MAX_QUERY_LENGTH = 80;
/** Max results per search request — Spotify dev-mode apps cap this at 10. */
const RESULT_LIMIT = 10;

/**
 * Server-side search proxy — keeps SPOTIFY_CLIENT_SECRET on the server and
 * lets the client fetch normalized results via /api/search?q=...&types=...
 * Falls back to the offline mock catalog when no credentials are configured.
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
    return NextResponse.json({ error: "Query parameter \'q\' is required." }, { status: 400 });
  }
  if (query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { error: `Query too long (max ${MAX_QUERY_LENGTH} characters).` },
      { status: 400 }
    );
  }

  const resolvedTypes: SpotifySearchType[] =
    types && types.length > 0 ? types : ["track", "album", "playlist"];

  // Resolve credentials (user → group → env)
  const { credentials, missingReason } = await resolveSpotifyCredentials();

  // No credentials available — return mock catalog
  if (!credentials) {
    return NextResponse.json({
      ...getMockSearch(query, resolvedTypes),
      missingReason,
    });
  }

  try {
    const results = await searchSpotify(query, {
      types: resolvedTypes,
      limit: RESULT_LIMIT,
      credentials,
    });
    return NextResponse.json({
      ...results,
      credentialStatus: "ok",
      credentialSource: credentials.source,
      groupName: credentials.groupName ?? null,
    });
  } catch (error) {
    if (error instanceof SpotifyApiError) {
      // Tell the user WHERE the bad credentials live so they can fix them.
      if (error.message.includes("invalid_client")) {
        const hint =
          credentials.source === "user"
            ? "Your personal Spotify credentials are invalid — update them in Settings."
            : credentials.source === "group"
              ? `The Spotify credentials of your group${credentials.groupName ? ` "${credentials.groupName}"` : ""} are invalid — ask the group owner to fix them.`
              : "The server's default Spotify credentials are invalid — contact the administrator.";
        return NextResponse.json({ error: hint }, { status: 502 });
      }
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    return NextResponse.json({ error: "Unexpected error while searching Spotify." }, { status: 500 });
  }
}