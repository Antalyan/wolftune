import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/game/difficulty?track_ids=id1,id2,...
 * Returns a map of track_spotify_id -> difficulty for the current user.
 * Tracks without a record default to 2 (starting difficulty).
 */
export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const trackIdsParam = searchParams.get("track_ids");

  if (!trackIdsParam) {
    return NextResponse.json({});
  }

  const trackIds = trackIdsParam.split(",").filter(Boolean);
  if (trackIds.length === 0) {
    return NextResponse.json({});
  }

  const { data, error } = await supabase
    .from("user_track_difficulty")
    .select("track_spotify_id, difficulty")
    .eq("user_id", user.id)
    .in("track_spotify_id", trackIds);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result: Record<string, number> = {};
  for (const row of data ?? []) {
    result[row.track_spotify_id] = row.difficulty;
  }

  return NextResponse.json(result);
}
