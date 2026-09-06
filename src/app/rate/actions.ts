"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ensureTrackSnapshots } from "@/lib/catalog";
import { MIN_SCORE, MAX_SCORE, type RateActionResult } from "@/types/rating";

interface TrackScoreInput {
  trackId: string;
  trackName: string;
  score: number;
}

interface AlbumRatingInput {
  albumId: string;
  albumName: string;
  artistName: string;
  coverUrl: string | null;
  tracks: TrackScoreInput[];
  subjectiveScore: number | null;
  note: string | null;
}

interface PlaylistRatingInput {
  playlistId: string;
  playlistName: string;
  ownerName: string;
  coverUrl: string | null;
  tracks: TrackScoreInput[];
  subjectiveScore: number | null;
  note: string | null;
}

function validateScores(tracks: TrackScoreInput[], subjective: number | null): string | null {
  for (const t of tracks) {
    if (!t.trackId) return "A track is missing its Spotify id.";
    if (
      !Number.isFinite(t.score) ||
      t.score < MIN_SCORE ||
      t.score > MAX_SCORE
    ) {
      return `Score for "${t.trackName || "a track"}" must be between ${MIN_SCORE} and ${MAX_SCORE}.`;
    }
    // One decimal precision max.
    if (Math.round(t.score * 10) !== t.score * 10) {
      return `Score for "${t.trackName || "a track"}" has too many decimals.`;
    }
  }
  if (
    subjective !== null &&
    (!Number.isFinite(subjective) || subjective < MIN_SCORE || subjective > MAX_SCORE)
  ) {
    return "The overall rating must be between 1 and 10.";
  }
  return null;
}

/**
 * Shared tail of both rating actions: ensures catalog rows exist, then
 * upserts the per-track ratings. Returns an error message or null.
 */
async function saveTrackRatings(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  tracks: TrackScoreInput[]
): Promise<string | null> {
  try {
    await ensureTrackSnapshots(
      tracks.map((t) => ({
        id: t.trackId,
        name: t.trackName,
        artists: [],
        album: null,
      }))
    );
  } catch (err) {
    return err instanceof Error ? err.message : "Failed to cache tracks.";
  }

  const { error } = await supabase.from("track_ratings").upsert(
    tracks.map((t) => ({
      user_id: userId,
      track_spotify_id: t.trackId,
      score: t.score,
    })),
    { onConflict: "user_id,track_spotify_id" }
  );
  return error?.message ?? null;
}

/**
 * Saves a full album rating: one row per rated track in track_ratings plus
 * the subjective overall score in album_ratings (kept separate — the computed
 * average uses track ratings only, per spec).
 */
export async function submitAlbumRating(
  input: AlbumRatingInput
): Promise<RateActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in.", success: null };

  if (!input.albumId) return { error: "Missing album id.", success: null };
  if (input.tracks.length === 0)
    return { error: "Rate at least one song before submitting.", success: null };

  const validationError = validateScores(input.tracks, input.subjectiveScore);
  if (validationError) return { error: validationError, success: null };

  // Make sure catalog snapshot rows exist (FK targets for ratings).
  const { error: catalogError } = await supabase.from("music_albums").upsert(
    {
      spotify_id: input.albumId,
      name: input.albumName,
      artist_name: input.artistName,
      cover_url: input.coverUrl,
      total_tracks: input.tracks.length,
    },
    { onConflict: "spotify_id" }
  );
  if (catalogError) return { error: `Failed to cache album: ${catalogError.message}`, success: null };

  const saveError = await saveTrackRatings(supabase, user.id, input.tracks);
  if (saveError) return { error: saveError, success: null };

  if (input.subjectiveScore !== null) {
    const { error: albumError } = await supabase.from("album_ratings").upsert(
      {
        user_id: user.id,
        album_spotify_id: input.albumId,
        subjective_score: input.subjectiveScore,
        note: input.note?.trim() || null,
      },
      { onConflict: "user_id,album_spotify_id" }
    );
    if (albumError) return { error: albumError.message, success: null };
  }

  revalidatePath(`/albums/${input.albumId}`);
  return { error: null, success: "Album rating saved." };
}

/**
 * Saves a playlist rating — a separate rating category from albums
 * (playlist_ratings table), so the two are never confused.
 */
export async function submitPlaylistRating(
  input: PlaylistRatingInput
): Promise<RateActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in.", success: null };

  if (!input.playlistId) return { error: "Missing playlist id.", success: null };
  if (input.tracks.length === 0)
    return { error: "Rate at least one song before submitting.", success: null };

  const validationError = validateScores(input.tracks, input.subjectiveScore);
  if (validationError) return { error: validationError, success: null };

  const { error: catalogError } = await supabase.from("music_playlists").upsert(
    {
      spotify_id: input.playlistId,
      name: input.playlistName,
      owner_name: input.ownerName,
      cover_url: input.coverUrl,
      total_tracks: input.tracks.length,
    },
    { onConflict: "spotify_id" }
  );
  if (catalogError)
    return { error: `Failed to cache playlist: ${catalogError.message}`, success: null };

  const saveError = await saveTrackRatings(supabase, user.id, input.tracks);
  if (saveError) return { error: saveError, success: null };

  if (input.subjectiveScore !== null) {
    const { error: playlistError } = await supabase.from("playlist_ratings").upsert(
      {
        user_id: user.id,
        playlist_spotify_id: input.playlistId,
        subjective_score: input.subjectiveScore,
        note: input.note?.trim() || null,
      },
      { onConflict: "user_id,playlist_spotify_id" }
    );
    if (playlistError) return { error: playlistError.message, success: null };
  }

  revalidatePath(`/playlists/${input.playlistId}`);
  return { error: null, success: "Playlist rating saved." };
}
