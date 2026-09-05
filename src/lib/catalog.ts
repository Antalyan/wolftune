import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  SpotifyAlbumSummary,
  SpotifyPlaylistSummary,
  SpotifyTrack,
} from "@/types/spotify";

/**
 * Catalog snapshots cache Spotify metadata locally (music_albums /
 * music_playlists / music_tracks) so ratings have a stable FK target and
 * statistics can be computed without hitting the Spotify API.
 * All writes are idempotent upserts keyed by spotify_id.
 */

export async function upsertAlbumSnapshot(
  album: SpotifyAlbumSummary,
  tracks: SpotifyTrack[]
): Promise<void> {
  const supabase = createClient();

  const { error: albumError } = await supabase.from("music_albums").upsert(
    {
      spotify_id: album.id,
      name: album.name,
      artist_name: album.artists.map((a) => a.name).join(", "),
      cover_url: album.images[0]?.url ?? null,
      release_date: album.release_date ?? null,
      total_tracks: album.total_tracks,
    },
    { onConflict: "spotify_id" }
  );
  if (albumError) throw new Error(`Failed to cache album: ${albumError.message}`);

  await upsertTrackSnapshots(tracks, album.id, album.name);
}

export async function upsertPlaylistSnapshot(
  playlist: SpotifyPlaylistSummary,
  tracks: SpotifyTrack[]
): Promise<void> {
  const supabase = createClient();

  const { error: playlistError } = await supabase.from("music_playlists").upsert(
    {
      spotify_id: playlist.id,
      name: playlist.name,
      owner_name: playlist.owner_name,
      cover_url: playlist.images[0]?.url ?? null,
      total_tracks: playlist.total_tracks ?? tracks.length,
    },
    { onConflict: "spotify_id" }
  );
  if (playlistError) throw new Error(`Failed to cache playlist: ${playlistError.message}`);

  await upsertTrackSnapshots(tracks, null, null);
}

/** Minimal track shape needed to write a snapshot row. */
export interface TrackLike {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  duration_ms?: number | null;
  album?: {
    id: string;
    name: string;
    images?: { url: string }[] | null;
  } | null;
}

async function upsertTrackSnapshots(
  tracks: TrackLike[],
  albumSpotifyId: string | null,
  albumName: string | null
): Promise<void> {
  if (tracks.length === 0) return;
  const supabase = createClient();

  const rows = tracks.map((t) => ({
    spotify_id: t.id,
    name: t.name,
    artist_name: t.artists.map((a) => a.name).join(", "),
    album_spotify_id: t.album?.id || albumSpotifyId,
    album_name: t.album?.name ?? albumName,
    cover_url: t.album?.images?.[0]?.url ?? null,
    duration_ms: t.duration_ms ?? null,
    track_number: null,
  }));

  const { error } = await supabase
    .from("music_tracks")
    .upsert(rows, { onConflict: "spotify_id" });
  if (error) throw new Error(`Failed to cache tracks: ${error.message}`);
}

/**
 * Ensures track snapshot rows exist for arbitrary Spotify track ids before a
 * rating references them (FK on track_ratings → music_tracks).
 */
export async function ensureTrackSnapshots(tracks: TrackLike[]): Promise<void> {
  const supabase = createClient();
  const ids = tracks.map((t) => t.id);
  if (ids.length === 0) return;

  const { data: existing } = await supabase
    .from("music_tracks")
    .select("spotify_id")
    .in("spotify_id", ids);

  const known = new Set((existing ?? []).map((r) => r.spotify_id));
  const missing = tracks.filter((t) => !known.has(t.id));
  if (missing.length === 0) return;

  await upsertTrackSnapshots(missing, null, null);
}
