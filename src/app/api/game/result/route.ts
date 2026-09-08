import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/game/result
 * Saves a round result: updates difficulty and stats for the track.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json();
  const {
    trackId,
    trackName,
    artistName,
    albumName,
    coverUrl,
    songCorrect,
    artistCorrect,
    newDifficulty,
  } = body;

  if (!trackId || newDifficulty == null) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  // Cache the track into the catalog so the game-history page can show its
  // name/artist/cover (best-effort; the catalog is denormalized, not a source
  // of truth). album_spotify_id is left null to avoid an FK to an uncached album.
  if (trackName) {
    const { error: cacheError } = await supabase.from("music_tracks").upsert(
      {
        spotify_id: trackId,
        name: trackName,
        artist_name: artistName ?? "Unknown",
        album_name: albumName ?? null,
        cover_url: coverUrl ?? null,
      },
      { onConflict: "spotify_id" }
    );
    if (cacheError) {
      console.error("[game-result] track cache failed:", cacheError.message);
    }
  }

  // Upsert difficulty
  const { error: diffError } = await supabase
    .from("user_track_difficulty")
    .upsert({
      user_id: user.id,
      track_spotify_id: trackId,
      difficulty: newDifficulty,
      updated_at: new Date().toISOString(),
    });

  if (diffError) {
    return NextResponse.json({ error: diffError.message }, { status: 500 });
  }

  // Upsert stats
  const isCorrect = songCorrect && artistCorrect;
  const { error: statsError } = await supabase.rpc("increment_track_stats", {
    p_user_id: user.id,
    p_track_spotify_id: trackId,
    p_correct: isCorrect ? 1 : 0,
    p_incorrect: isCorrect ? 0 : 1,
  });

  if (statsError) {
    return NextResponse.json({ error: statsError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
