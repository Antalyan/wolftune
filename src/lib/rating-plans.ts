import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Group rating plans — collaborative scheduling of what a group rates next.
 * Each entry pins a date, an assigned member, and a single target (album OR
 * playlist). Any group member can add/edit/delete entries. Completing a plan
 * is done through the normal rating flow; here we only track whether the
 * assigned member has already rated the target.
 *
 * NOTE: queries follow the codebase convention of fetching tables separately
 * and joining in TypeScript (rather than inline Supabase joins), since the
 * generated Database types don't model those relationships.
 */

export type PlanTargetKind = "album" | "playlist";

export interface PlanMember {
  userId: string;
  username: string;
  avatarUrl: string | null;
}

export interface PlanTarget {
  kind: PlanTargetKind;
  spotifyId: string;
  name: string;
  /** Album artist name, or playlist owner name. */
  subtitle: string;
  coverUrl: string | null;
}

export interface RatingPlanEntry {
  id: string;
  groupId: string;
  scheduledDate: string; // ISO date (yyyy-mm-dd)
  assignedMember: PlanMember;
  target: PlanTarget;
  /** True when the assigned member has already rated this target. */
  done: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Returns all rating plans for a group, oldest-date first, enriched with
 * member + target display data and a `done` flag. Used by the group detail
 * page and the statistics page.
 */
export async function getGroupRatingPlans(
  supabase: SupabaseClient<Database>,
  groupId: string
): Promise<RatingPlanEntry[]> {
  const { data, error } = await supabase
    .from("group_rating_plans")
    .select(
      "id, group_id, album_spotify_id, playlist_spotify_id, assigned_member_id, scheduled_date, created_at, updated_at"
    )
    .eq("group_id", groupId)
    .order("scheduled_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) {
    if (error) console.error("[rating-plans] getGroupRatingPlans:", error.message);
    return [];
  }

    // Collect the ids we need to resolve for display + done-detection.
  const memberIds = Array.from(new Set(data.map((r) => r.assigned_member_id)));
  const albumIds = Array.from(
    new Set(data.map((r) => r.album_spotify_id).filter((x): x is string => x !== null))
  );
  const playlistIds = Array.from(
    new Set(data.map((r) => r.playlist_spotify_id).filter((x): x is string => x !== null))
  );

  // Resolve display data + done-status in parallel.
  const [{ data: profiles }, { data: albums }, { data: playlists }, doneSet] =
    await Promise.all([
      supabase.from("profiles").select("id, username, avatar_url").in("id", memberIds),
      albumIds.length > 0
        ? supabase
            .from("music_albums")
            .select("spotify_id, name, artist_name, cover_url")
            .in("spotify_id", albumIds)
        : Promise.resolve({ data: [] as Database["public"]["Tables"]["music_albums"]["Row"][] }),
      playlistIds.length > 0
        ? supabase
            .from("music_playlists")
            .select("spotify_id, name, owner_name, cover_url")
            .in("spotify_id", playlistIds)
        : Promise.resolve({ data: [] as Database["public"]["Tables"]["music_playlists"]["Row"][] }),
      resolveDone(supabase, data, memberIds),
    ]);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, { username: p.username, avatarUrl: p.avatar_url }])
  );
  const albumMap = new Map(
    (albums ?? []).map((a) => [a.spotify_id, a])
  );
  const playlistMap = new Map(
    (playlists ?? []).map((p) => [p.spotify_id, p])
  );

  return data.map((row) => {
    const isAlbum = row.album_spotify_id !== null;
    const targetSpotifyId = isAlbum
      ? (row.album_spotify_id as string)
      : (row.playlist_spotify_id as string);

    const prof = profileMap.get(row.assigned_member_id);
    const album = isAlbum ? albumMap.get(targetSpotifyId) : undefined;
    const playlist = !isAlbum ? playlistMap.get(targetSpotifyId) : undefined;

    return {
      id: row.id,
      groupId: row.group_id,
      scheduledDate: row.scheduled_date,
      assignedMember: {
        userId: row.assigned_member_id,
        username: prof?.username ?? "Unknown",
        avatarUrl: prof?.avatarUrl ?? null,
      },
      target: isAlbum
        ? {
            kind: "album" as const,
            spotifyId: row.album_spotify_id as string,
            name: album?.name ?? "Unknown album",
            subtitle: album?.artist_name ?? "",
            coverUrl: album?.cover_url ?? null,
          }
        : {
            kind: "playlist" as const,
            spotifyId: row.playlist_spotify_id as string,
            name: playlist?.name ?? "Unknown playlist",
            subtitle: playlist?.owner_name ?? "",
            coverUrl: playlist?.cover_url ?? null,
          },
      done: doneSet.has(`${row.assigned_member_id}:${targetSpotifyId}`),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
}

/** Album plan = done if the member submitted a subjective album rating OR rated >=1 track in the album. */
async function resolveDone(
  supabase: SupabaseClient<Database>,
  plans: Database["public"]["Tables"]["group_rating_plans"]["Row"][],
  memberIds: string[]
): Promise<Set<string>> {
  const doneSet = new Set<string>();

  const albumChecks: Array<{ spotifyId: string; memberId: string }> = [];
  const seenAlbumTargets = new Map<string, string>();
  for (const p of plans.filter((p) => p.album_spotify_id !== null)) {
    seenAlbumTargets.set(p.album_spotify_id as string, p.assigned_member_id);
  }
  seenAlbumTargets.forEach((memberId, spotifyId) => {
    albumChecks.push({ spotifyId, memberId });
  });

  const playlistChecks = plans
    .filter((p) => p.playlist_spotify_id !== null)
    .map((p) => ({
      spotifyId: p.playlist_spotify_id as string,
      memberId: p.assigned_member_id,
    }));

    const pending: PromiseLike<unknown>[] = [];

  if (albumChecks.length > 0) {
        const albumIds = Array.from(new Set(albumChecks.map((c) => c.spotifyId)));
    pending.push(
      supabase
        .from("album_ratings")
        .select("user_id, album_spotify_id")
        .in("user_id", memberIds)
        .in("album_spotify_id", albumIds)
        .then(({ data }) => {
          for (const r of data ?? []) doneSet.add(`${r.user_id}:${r.album_spotify_id}`);
        })
    );

    // Track ratings -> albums via music_tracks (fetched separately, joined in memory).
    pending.push(
      supabase
        .from("track_ratings")
        .select("user_id, track_spotify_id")
        .in("user_id", memberIds)
        .then(async ({ data: trackRows }) => {
          const trackIds = (trackRows ?? []).map((r) => r.track_spotify_id);
          if (trackIds.length === 0) return;
          const trackToAlbum = await fetchTrackToAlbum(supabase, trackIds);
          for (const r of trackRows ?? []) {
            const albumId = trackToAlbum.get(r.track_spotify_id);
            if (albumId) doneSet.add(`${r.user_id}:${albumId}`);
          }
        })
    );
  }

  if (playlistChecks.length > 0) {
    pending.push(
      supabase
        .from("playlist_ratings")
        .select("user_id, playlist_spotify_id")
        .in("user_id", memberIds)
        .in(
          "playlist_spotify_id",
          playlistChecks.map((c) => c.spotifyId)
        )
        .then(({ data }) => {
          for (const r of data ?? []) doneSet.add(`${r.user_id}:${r.playlist_spotify_id}`);
        })
    );
  }

  await Promise.all(pending);
  return doneSet;
}

/** Batched track -> album resolution (IN lists can get long for heavy users). */
async function fetchTrackToAlbum(
  supabase: SupabaseClient<Database>,
  trackIds: string[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  for (let i = 0; i < trackIds.length; i += 200) {
    const batch = trackIds.slice(i, i + 200);
    const { data } = await supabase
      .from("music_tracks")
      .select("spotify_id, album_spotify_id")
      .in("spotify_id", batch);
    for (const t of data ?? []) {
      if (t.album_spotify_id) result.set(t.spotify_id, t.album_spotify_id);
    }
  }
  return result;
}
