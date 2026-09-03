import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Server-side proxy for pausing Spotify playback. Keeps the user's OAuth token
 * off the browser — see /api/spotify/play for the rationale.
 */
export async function PUT() {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const providerToken = session?.provider_token;
  if (!providerToken) {
    return NextResponse.json({ error: "not_connected" }, { status: 401 });
  }

  const res = await fetch("https://api.spotify.com/v1/me/player/pause", {
    method: "PUT",
    headers: { Authorization: `Bearer ${providerToken}` },
  });

  if (!res.ok && res.status !== 204) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `spotify_${res.status}`, details: text },
      { status: res.status }
    );
  }

  return NextResponse.json({ ok: true });
}
