import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface PlayRequest {
  deviceId: string;
  uri: string;
  positionMs?: number;
}

/**
 * Server-side proxy for Spotify playback.
 *
 * The browser must NOT hold the user's Spotify OAuth token. The Web Playback
 * SDK needs it client-side (unavoidable — it authenticates directly with
 * Spotify), but our own API calls go through here so the provider_token stays
 * on the server.
 */
export async function PUT(request: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  // provider_token lives on the session object; it is NOT used to establish
  // identity — the verified identity comes from getUser() above.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const providerToken = session?.provider_token;
  if (!providerToken) {
    return NextResponse.json({ error: "not_connected" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as PlayRequest | null;
  if (!body?.deviceId || !body?.uri) {
    return NextResponse.json({ error: "deviceId and uri are required" }, { status: 400 });
  }

  const res = await fetch("https://api.spotify.com/v1/me/player/play", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${providerToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      device_id: body.deviceId,
      uris: [body.uri],
      position_ms: body.positionMs ?? 0,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `spotify_${res.status}`, details: text },
      { status: res.status }
    );
  }

  return NextResponse.json({ ok: true });
}
