import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SpotifyMeStatus } from "@/types/spotify";

export const dynamic = "force-dynamic";

interface SpotifyMe {
  id: string;
  display_name: string | null;
  product?: string;
}

/** Reports the signed-in user's Spotify connection + subscription status. */
export async function GET() {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const spotifyIdentity = session?.user.identities?.find((i) => i.provider === "spotify");
  if (!session || !spotifyIdentity) {
    return NextResponse.json({ connected: false } satisfies SpotifyMeStatus);
  }

  const providerToken = session.provider_token;
  if (!providerToken) {
    return NextResponse.json({
      connected: true,
      premium: false,
      error: "missing_provider_token",
    } satisfies SpotifyMeStatus);
  }

  const res = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${providerToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json({
      connected: true,
      premium: false,
      error: `spotify_${res.status}`,
    } satisfies SpotifyMeStatus);
  }

  const me = (await res.json()) as SpotifyMe;
  return NextResponse.json({
    connected: true,
    premium: me.product === "premium",
    spotifyId: me.id,
    displayName: me.display_name,
  } satisfies SpotifyMeStatus);
}
