import "server-only";
import type {SupabaseClient} from "@supabase/supabase-js";
import type {Database} from "@/types/database";

/**
 * "My Ratings" data — every album and playlist a user has rated, with the
 * user's own score(s) attached. Fetched once on the server (even for
 * hundreds of ratings) then searched/sorted/paginated client-side.
 */

export interface MyRatingAlbum {
    kind: "album";
    spotifyId: string;
    name: string;
    artistName: string;
    coverUrl: string | null;
    subjectiveScore: number | null;
    note: string | null;
    trackAvg: number | null;
    trackCount: number;
    ratedAt: string;
}

export interface MyRatingPlaylist {
    kind: "playlist";
    spotifyId: string;
    name: string;
    ownerName: string;
    coverUrl: string | null;
    subjectiveScore: number | null;
    note: string | null;
    ratedAt: string;
}

export type MyRating = MyRatingAlbum | MyRatingPlaylist;

export interface MyRatingsData {
    albums: MyRatingAlbum[];
    playlists: MyRatingPlaylist[];
}

export async function getMyRatings(
    supabase: SupabaseClient<Database>,
    userId: string
): Promise<MyRatingsData> {
    const [albumRatings, trackRatings, playlistRatings] = await Promise.all([
        supabase
            .from("album_ratings")
            .select("album_spotify_id, subjective_score, note, updated_at")
            .eq("user_id", userId),
        supabase
            .from("track_ratings")
            .select("track_spotify_id, score, updated_at")
            .eq("user_id", userId),
        supabase
            .from("playlist_ratings")
            .select("playlist_spotify_id, subjective_score, note, updated_at")
            .eq("user_id", userId),
    ]);

    // -- Albums: subjective ratings (direct) + track ratings rolled up to albums
    const albumIds = new Set<string>();
    const subjectiveByAlbum = new Map<
        string,
        { subjectiveScore: number; note: string | null; updatedAt: string }
    >();
    for (const r of albumRatings.data ?? []) {
        albumIds.add(r.album_spotify_id);
        subjectiveByAlbum.set(r.album_spotify_id, {
            subjectiveScore: Number(r.subjective_score),
            note: r.note,
            updatedAt: r.updated_at,
        });
    }

    const trackIds = (trackRatings.data ?? []).map((r) => r.track_spotify_id);
    const trackScoreById = new Map<string, { score: number; updatedAt: string }>();
    for (const r of trackRatings.data ?? []) {
        trackScoreById.set(r.track_spotify_id, {
            score: Number(r.score),
            updatedAt: r.updated_at,
        });
    }

    // Resolve tracks -> albums + aggregate per-track scores in a single pass
    // per batch (IN lists can get long, so we cap each query).
    const trackAgg = new Map<
        string,
        { total: number; count: number; latest: string }
    >();
    if (trackIds.length > 0) {
        for (let i = 0; i < trackIds.length; i += 200) {
            const batch = trackIds.slice(i, i + 200);
            const {data: tracks} = await supabase
                .from("music_tracks")
                .select("spotify_id, album_spotify_id")
                .in("spotify_id", batch);
            for (const t of tracks ?? []) {
                if (t.album_spotify_id) albumIds.add(t.album_spotify_id);
                const sc = trackScoreById.get(t.spotify_id);
                if (!sc || !t.album_spotify_id) continue;
                const prev = trackAgg.get(t.album_spotify_id);
                const e = prev ?? {total: 0, count: 0, latest: "0"};
                e.total += sc.score;
                e.count += 1;
                if (sc.updatedAt > e.latest) e.latest = sc.updatedAt;
                trackAgg.set(t.album_spotify_id, e);
            }
        }
    }

        const albumMeta = await fetchAlbumMeta(supabase, Array.from(albumIds));

    const albums: MyRatingAlbum[] = albumMeta.map((a) => {
        const subj = subjectiveByAlbum.get(a.spotify_id);
        const agg = trackAgg.get(a.spotify_id);
        const ratedAt =
            [subj?.updatedAt, agg?.latest].filter(Boolean).sort().reverse()[0] ?? "";
        return {
            kind: "album",
            spotifyId: a.spotify_id,
            name: a.name,
            artistName: a.artist_name,
            coverUrl: a.cover_url,
            subjectiveScore: subj?.subjectiveScore ?? null,
            note: subj?.note ?? null,
            trackAvg: agg ? Math.round((agg.total / agg.count) * 10) / 10 : null,
            trackCount: agg?.count ?? 0,
            ratedAt,
        };
    });

    // -- Playlists
    const playlistIds = (playlistRatings.data ?? []).map((r) => r.playlist_spotify_id);
    const playlistMeta = await fetchPlaylistMeta(supabase, playlistIds);
    const playlists: MyRatingPlaylist[] = (playlistRatings.data ?? []).map((r) => {
        const meta = playlistMeta.get(r.playlist_spotify_id);
        return {
            kind: "playlist",
            spotifyId: r.playlist_spotify_id,
            name: meta?.name ?? "Unknown playlist",
            ownerName: meta?.owner_name ?? "",
            coverUrl: meta?.cover_url ?? null,
            subjectiveScore: Number(r.subjective_score),
            note: r.note,
            ratedAt: r.updated_at,
        };
    });

    return {albums, playlists};
}

interface AlbumMetaRow {
    spotify_id: string;
    name: string;
    artist_name: string;
    cover_url: string | null;
}

async function fetchAlbumMeta(
    supabase: SupabaseClient<Database>,
    ids: string[]
): Promise<AlbumMetaRow[]> {
    if (ids.length === 0) return [];
    const {data} = await supabase
        .from("music_albums")
        .select("spotify_id, name, artist_name, cover_url")
        .in("spotify_id", ids);
    return (data ?? []) as AlbumMetaRow[];
}

interface PlaylistMetaRow {
    spotify_id?: string;
    name: string;
    owner_name: string;
    cover_url: string | null;
}

async function fetchPlaylistMeta(
    supabase: SupabaseClient<Database>,
    ids: string[]
): Promise<Map<string, PlaylistMetaRow>> {
    if (ids.length === 0) return new Map();
    const {data} = await supabase
        .from("music_playlists")
        .select("spotify_id, name, owner_name, cover_url")
        .in("spotify_id", ids);
    const map = new Map<string, PlaylistMetaRow>();
    for (const row of (data ?? []) as PlaylistMetaRow[]) {
        map.set(row.spotify_id ?? "", row);
    }
    return map;
}
