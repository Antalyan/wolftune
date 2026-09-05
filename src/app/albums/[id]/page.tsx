import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveSpotifyCredentials } from "@/lib/spotify-credentials";
import { getAlbumWithTracks, SpotifyApiError } from "@/lib/spotify";
import { upsertAlbumSnapshot } from "@/lib/catalog";
import { RatingForm, type RateableTrack } from "@/components/RatingForm";
import { GroupRatingsPanel } from "@/components/GroupRatingsPanel";
import { getUserGroups } from "@/lib/groups";
import { WolfMascot } from "@/components/WolfMascot";
import Link from "next/link";
import { KeyRound } from "lucide-react";

export const dynamic = "force-dynamic";

interface AlbumRatePageProps {
  params: { id: string };
}

export default async function AlbumRatePage({ params }: AlbumRatePageProps) {
  const { id } = params;

  const { credentials, missingReason } = await resolveSpotifyCredentials();
  if (!credentials) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <KeyRound className="w-10 h-10 text-amber-400 mx-auto" />
        <h2 className="mt-4 text-xl font-bold text-white">Spotify credentials needed</h2>
        <p className="mt-2 text-sm text-zinc-400 max-w-md mx-auto">{missingReason}</p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <Link
            href="/settings"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
          >
            Settings
          </Link>
          <Link
            href="/groups"
            className="px-4 py-2 rounded-xl border border-night-600 text-zinc-300 font-bold text-xs"
          >
            Groups
          </Link>
        </div>
      </div>
    );
  }

  let album;
  let spotifyTracks;
  try {
    const result = await getAlbumWithTracks(id, credentials);
    album = result.album;
    spotifyTracks = result.tracks;
  } catch (error) {
    if (error instanceof SpotifyApiError && error.status === 404) notFound();
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <WolfMascot size={70} mood="cool" />
        <h2 className="mt-4 text-xl font-bold text-white">Could not load album</h2>
        <p className="mt-2 text-sm text-zinc-400">
          {error instanceof Error ? error.message : "Unexpected error."}
        </p>
        <Link href="/rate" className="mt-4 inline-block text-xs text-zinc-400 hover:text-white underline">
          Back to rate
        </Link>
      </div>
    );
  }

  // Cache the catalog snapshot so ratings have stable FK targets.
  try {
    await upsertAlbumSnapshot(album, spotifyTracks);
  } catch {
    // Snapshot caching is best-effort — the rating action re-attempts it.
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialTrackScores: Record<string, number> = {};
  let initialSubjectiveScore: number | null = null;
  let initialNote: string | null = null;

  if (user) {
    const trackIds = spotifyTracks.map((t) => t.id);
    const [{ data: trackRatings }, { data: albumRating }] = await Promise.all([
      supabase
        .from("track_ratings")
        .select("track_spotify_id, score")
        .eq("user_id", user.id)
        .in("track_spotify_id", trackIds),
      supabase
        .from("album_ratings")
        .select("subjective_score, note")
        .eq("user_id", user.id)
        .eq("album_spotify_id", album.id)
        .single(),
    ]);

    for (const r of trackRatings ?? []) {
      initialTrackScores[r.track_spotify_id] = Number(r.score);
    }
    if (albumRating) {
      initialSubjectiveScore = Number(albumRating.subjective_score);
      initialNote = albumRating.note;
    }
  }

  const groups = user ? await getUserGroups(supabase, user.id) : [];

  const tracks: RateableTrack[] = spotifyTracks.map((t) => ({
    id: t.id,
    name: t.name,
    artistName: t.artists.map((a) => a.name).join(", "),
    durationMs: t.duration_ms,
  }));

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 w-full">
      {!user && (
        <p className="mb-4 text-xs text-amber-300 bg-amber-950/30 border border-amber-900/40 rounded-lg px-3 py-2">
          You&apos;re browsing as a guest — <Link href="/auth/login" className="underline">sign in</Link> to save
          your ratings.
        </p>
      )}
      <RatingForm
        kind="album"
        title={album.name}
        subtitle={`${album.artists.map((a) => a.name).join(", ")} · ${album.total_tracks} tracks · ${album.release_date ?? ""}`}
        coverUrl={album.images[0]?.url ?? null}
        tracks={tracks}
        initialTrackScores={initialTrackScores}
        initialSubjectiveScore={initialSubjectiveScore}
        initialNote={initialNote}
        target={{
          kind: "album",
          albumId: album.id,
          albumName: album.name,
          artistName: album.artists.map((a) => a.name).join(", "),
          coverUrl: album.images[0]?.url ?? null,
        }}
      />
      {user && groups.length > 0 && (
        <div className="mt-6">
          <GroupRatingsPanel
            groups={groups}
            kind="album"
            targetId={album.id}
            tracks={tracks.map((t) => ({ id: t.id, name: t.name }))}
          />
        </div>
      )}
    </div>
  );
}
