import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserAccessToken } from "@/lib/spotify-user-token";

export const dynamic = "force-dynamic";

/**
 * GET /api/spotify/sdk-token
 * Returns the signed-in user's Spotify access token (obtained from the
 * app's own OAuth flow, not Supabase's), used only by the Web Playback SDK
 * on the client. Token is delivered over HTTPS to the same origin.
 */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  try {
    const accessToken = await getUserAccessToken(user.id);
    if (!accessToken) {
      return NextResponse.json({ error: "Spotify not connected." }, { status: 400 });
    }
    return NextResponse.json({ accessToken });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Failed to get Spotify access token." },
      { status: 500 }
    );
  }
}
