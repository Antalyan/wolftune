import { NextResponse } from "next/server";
import { getAlbumWithTracks, SpotifyApiError } from "@/lib/spotify";
import { resolveSpotifyCredentials } from "@/lib/spotify-credentials";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { credentials } = await resolveSpotifyCredentials();
  if (!credentials) return NextResponse.json({ error: "no_credentials" }, { status: 403 });
  try {
    const result = await getAlbumWithTracks(params.id, credentials);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SpotifyApiError) return NextResponse.json({ error: error.message }, { status: error.status ?? 502 });
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
