import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const CLIENT_ID_RE = /^[A-Za-z0-9]{32}$/;
const CLIENT_SECRET_RE = /^[A-Za-z0-9]{32}$/;

/**
 * Saves or clears the signed-in user's personal Spotify API credentials.
 * Validates format before writing to profiles table.
 */
export async function POST(request: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    clientId?: string;
    clientSecret?: string;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const clientId = (body.clientId ?? "").trim();
  const clientSecret = (body.clientSecret ?? "").trim();

  // Clearing: both empty
  if (!clientId && !clientSecret) {
    const { error } = await supabase
      .from("profiles")
      .update({ spotify_client_id: null, spotify_client_secret: null })
      .eq("id", user.id);

    if (error) {
      return NextResponse.json({ error: "Failed to clear credentials." }, { status: 500 });
    }
    return NextResponse.json({ message: "Credentials cleared." });
  }

  // Partial: reject
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Both Client ID and Client Secret are required." },
      { status: 400 }
    );
  }

  // Validate format (Spotify credentials are 32-char alphanumeric)
  if (!CLIENT_ID_RE.test(clientId)) {
    return NextResponse.json(
      { error: "Invalid Client ID format. Expected 32 alphanumeric characters." },
      { status: 400 }
    );
  }
  if (!CLIENT_SECRET_RE.test(clientSecret)) {
    return NextResponse.json(
      { error: "Invalid Client Secret format. Expected 32 alphanumeric characters." },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("profiles")
    .update({ spotify_client_id: clientId, spotify_client_secret: clientSecret })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to save credentials." }, { status: 500 });
  }

  return NextResponse.json({ message: "Credentials saved successfully." });
}
