import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getGroupRatingPlans, type RatingPlanEntry } from "@/lib/rating-plans";

/**
 * Group statistics (Phase 4). All aggregations are computed in TypeScript from
 * raw rating rows — the datasets per group are small, and this avoids relying
 * on Postgres aggregate functions through the supabase-js query builder.
 */

export interface GroupBestTrack {
  trackId: string;
  name: string;
  artistName: string;
  albumName: string | null;
  albumId: string | null;
  avg: number;
  ratingsCount: number;
}

export interface GroupBestAlbum {
  albumId: string;
  name: string;
  artistName: string;
  avg: number;
  ratingsCount: number;
}

export interface GroupBestPlaylist {
  playlistId: string;
  name: string;
  ownerName: string | null;
  avg: number;
  ratingsCount: number;
}

export interface MemberSimilarity {
  userAId: string;
  userBId: string;
  usernameA: string;
  usernameB: string;
  /** Pearson correlation over shared track ratings, -1..1 (null if not computable). */
  correlation: number | null;
  sharedTracks: number;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

export async function getGroupMemberIds(
  supabase: SupabaseClient<Database>,
  groupId: string
): Promise<string[]> {
  const { data } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId);
  return (data ?? []).map((m) => m.user_id);
}

/** Best songs in the group: average per-track score across member ratings. */
export async function getGroupBestTracks(
  supabase: SupabaseClient<Database>,
  groupId: string,
  limit = 10
): Promise<GroupBestTrack[]> {
  const memberIds = await getGroupMemberIds(supabase, groupId);
  if (memberIds.length === 0) return [];

  const [{ data: ratings }, { data: tracks }] = await Promise.all([
    supabase
      .from("track_ratings")
      .select("track_spotify_id, score")
      .in("user_id", memberIds),
    supabase
      .from("music_tracks")
      .select("spotify_id, name, artist_name, album_name, album_spotify_id"),
  ]);

  const sums = new Map<string, { total: number; count: number }>();
  for (const r of ratings ?? []) {
    const e = sums.get(r.track_spotify_id) ?? { total: 0, count: 0 };
    e.total += Number(r.score);
    e.count += 1;
    sums.set(r.track_spotify_id, e);
  }

  const trackInfo = new Map(
    (tracks ?? []).map((t) => [
      t.spotify_id,
      {
        name: t.name,
        artistName: t.artist_name,
        albumName: t.album_name,
        albumId: t.album_spotify_id,
      },
    ])
  );

  return Array.from(sums.entries())
    .map(([trackId, { total, count }]) => {
      const info = trackInfo.get(trackId);
      return {
        trackId,
        name: info?.name ?? "Unknown track",
        artistName: info?.artistName ?? "",
        albumName: info?.albumName ?? null,
        albumId: info?.albumId ?? null,
        avg: round1(total / count),
        ratingsCount: count,
      };
    })
    .sort((a, b) => b.avg - a.avg || b.ratingsCount - a.ratingsCount)
    .slice(0, limit);
}

/** Best albums in the group by the subjective album score (kept separate per spec). */
export async function getGroupBestAlbums(
  supabase: SupabaseClient<Database>,
  groupId: string,
  limit = 5
): Promise<GroupBestAlbum[]> {
  const memberIds = await getGroupMemberIds(supabase, groupId);
  if (memberIds.length === 0) return [];

  const [{ data: ratings }, { data: albums }] = await Promise.all([
    supabase
      .from("album_ratings")
      .select("album_spotify_id, subjective_score")
      .in("user_id", memberIds),
    supabase.from("music_albums").select("spotify_id, name, artist_name"),
  ]);

  const sums = new Map<string, { total: number; count: number }>();
  for (const r of ratings ?? []) {
    const e = sums.get(r.album_spotify_id) ?? { total: 0, count: 0 };
    e.total += Number(r.subjective_score);
    e.count += 1;
    sums.set(r.album_spotify_id, e);
  }

  const albumInfo = new Map(
    (albums ?? []).map((a) => [a.spotify_id, { name: a.name, artistName: a.artist_name }])
  );

  return Array.from(sums.entries())
    .map(([albumId, { total, count }]) => {
      const info = albumInfo.get(albumId);
      return {
        albumId,
        name: info?.name ?? "Unknown album",
        artistName: info?.artistName ?? "",
        avg: round1(total / count),
        ratingsCount: count,
      };
    })
    .sort((a, b) => b.avg - a.avg || b.ratingsCount - a.ratingsCount)
    .slice(0, limit);
}

/** Best playlists in the group by the subjective playlist score. */
export async function getGroupBestPlaylists(
  supabase: SupabaseClient<Database>,
  groupId: string,
  limit = 5
): Promise<GroupBestPlaylist[]> {
  const memberIds = await getGroupMemberIds(supabase, groupId);
  if (memberIds.length === 0) return [];

  const [{ data: ratings }, { data: playlists }] = await Promise.all([
    supabase
      .from("playlist_ratings")
      .select("playlist_spotify_id, subjective_score")
      .in("user_id", memberIds),
    supabase.from("music_playlists").select("spotify_id, name, owner_name"),
  ]);

  const sums = new Map<string, { total: number; count: number }>();
  for (const r of ratings ?? []) {
    const e = sums.get(r.playlist_spotify_id) ?? { total: 0, count: 0 };
    e.total += Number(r.subjective_score);
    e.count += 1;
    sums.set(r.playlist_spotify_id, e);
  }

  const plInfo = new Map(
    (playlists ?? []).map((p) => [p.spotify_id, { name: p.name, ownerName: p.owner_name }])
  );

  return Array.from(sums.entries())
    .map(([playlistId, { total, count }]) => {
      const info = plInfo.get(playlistId);
      return {
        playlistId,
        name: info?.name ?? "Unknown playlist",
        ownerName: info?.ownerName ?? null,
        avg: round1(total / count),
        ratingsCount: count,
      };
    })
    .sort((a, b) => b.avg - a.avg || b.ratingsCount - a.ratingsCount)
    .slice(0, limit);
}

/**
 * Pairwise similarity between group members: Pearson correlation of their
 * track ratings over the tracks both users have rated. 1 = identical taste,
 * 0 = unrelated, negative = opposite tendencies.
 */
export async function getMemberSimilarities(
  supabase: SupabaseClient<Database>,
  groupId: string
): Promise<MemberSimilarity[]> {
  const { data: memberships } = await supabase
    .from("group_members")
    .select("user_id, profiles (id, username)")
    .eq("group_id", groupId);
  if (!memberships || memberships.length < 2) return [];

  const memberIds = memberships.map((m) => m.user_id);
  const usernames = new Map<string, string>();
  for (const m of memberships) {
    const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    if (p) usernames.set(p.id, p.username);
  }

  const { data: ratings } = await supabase
    .from("track_ratings")
    .select("user_id, track_spotify_id, score")
    .in("user_id", memberIds);

  // user -> (track -> score)
  const byUser = new Map<string, Map<string, number>>();
  for (const r of ratings ?? []) {
    let inner = byUser.get(r.user_id);
    if (!inner) {
      inner = new Map();
      byUser.set(r.user_id, inner);
    }
    inner.set(r.track_spotify_id, Number(r.score));
  }

  const results: MemberSimilarity[] = [];
  for (let i = 0; i < memberIds.length; i++) {
    for (let j = i + 1; j < memberIds.length; j++) {
      const a = memberIds[i];
      const b = memberIds[j];
      const mapA = byUser.get(a);
      const mapB = byUser.get(b);
      if (!mapA || !mapB) continue;

      // Shared tracks only.
      const shared: { x: number; y: number }[] = [];
      for (const [trackId, x] of Array.from(mapA.entries())) {
        const y = mapB.get(trackId);
        if (y !== undefined) shared.push({ x, y });
      }
      if (shared.length < 2) {
        results.push({
          userAId: a,
          userBId: b,
          usernameA: usernames.get(a) ?? "Unknown",
          usernameB: usernames.get(b) ?? "Unknown",
          correlation: null,
          sharedTracks: shared.length,
        });
        continue;
      }

      const n = shared.length;
      const meanX = shared.reduce((s, p) => s + p.x, 0) / n;
      const meanY = shared.reduce((s, p) => s + p.y, 0) / n;
      let cov = 0;
      let varX = 0;
      let varY = 0;
      for (const { x, y } of shared) {
        const dx = x - meanX;
        const dy = y - meanY;
        cov += dx * dy;
        varX += dx * dx;
        varY += dy * dy;
      }
      const denom = Math.sqrt(varX * varY);
      results.push({
        userAId: a,
        userBId: b,
        usernameA: usernames.get(a) ?? "Unknown",
        usernameB: usernames.get(b) ?? "Unknown",
        correlation: denom > 0 ? Math.round((cov / denom) * 100) / 100 : null,
        sharedTracks: n,
      });
    }
  }

  return results.sort((x, y) => (y.correlation ?? -2) - (x.correlation ?? -2));
}

/** Rating plans for a group, surfaced in statistics. Reuses the rating-plans lib. */
export async function getGroupPlansForStats(
  supabase: SupabaseClient<Database>,
  groupId: string
): Promise<RatingPlanEntry[]> {
  return getGroupRatingPlans(supabase, groupId);
}
