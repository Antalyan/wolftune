import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPlaylistWithTracks, SpotifyApiError } from "@/lib/spotify";
import { getUserAccessToken } from "@/lib/spotify-user-token";
import { upsertPlaylistSnapshot } from "@/lib/catalog";
import { RatingForm, type RateableTrack } from "@/components/RatingForm";
import { GroupRatingsPanel } from "@/components/GroupRatingsPanel";
import { getUserGroups } from "@/lib/groups";
import { WolfMascot } from "@/components/WolfMascot";
import Link from "next/link";
import { KeyRound } from "lucide-react";

export const dynamic = "force-dynamic";

interface PlaylistRatePageProps {
  params: { id: string };
}

export default async function PlaylistRatePage({ params }: PlaylistRatePageProps) {
  const { id } = params;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("[spotify-debug] playlist page:", { userId: user?.id ?? null });

  // Playlist contents (/playlists/{id}/tracks) REQUIRE a user OAuth token — the
  // Client Credentials token cannot access this endpoint (403). Require it.
  const userAccessToken = user ? await getUserAccessToken(user.id) : null;

  console.log("[spotify-debug] playlist page:", { hasToken: !!userAccessToken });

  if (!userAccessToken) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <KeyRound className="w-10 h-10 text-amber-400 mx-auto" />
        <h2 className="mt-4 text-xl font-bold text-white">Connect Spotify to view playlists</h2>
        <p className="mt-2 text-sm text-zinc-400 max-w-md mx-auto">
          Playlist contents require a Spotify OAuth connection. Connect your account in Settings
          to view and rate your playlists.
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <Link
            href="/settings"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
          >
            Settings
          </Link>
          <Link
            href="/rate"
            className="px-4 py-2 rounded-xl border border-night-600 text-zinc-300 font-bold text-xs"
          >
            Back to rate
          </Link>
        </div>
      </div>
    );
  }

  let playlist;
  let spotifyTracks;
  try {
    const result = await getPlaylistWithTracks(id, undefined, userAccessToken);
    playlist = result.playlist;
    spotifyTracks = result.tracks;
  } catch (error) {
    if (error instanceof SpotifyApiError && error.status === 404) notFound();
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <WolfMascot size={70} mood="cool" />
        <h2 className="mt-4 text-xl font-bold text-white">Could not load playlist</h2>
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
    await upsertPlaylistSnapshot(playlist, spotifyTracks);
  } catch {
    // Snapshot caching is best-effort — the rating action re-attempts it.
  }

  let initialTrackScores: Record<string, number> = {};
  let initialSubjectiveScore: number | null = null;
  let initialNote: string | null = null;

  if (user) {
    const trackIds = spotifyTracks.map((t) => t.id);
    const [{ data: trackRatings }, { data: playlistRating }] = await Promise.all([
      supabase
        .from("track_ratings")
        .select("track_spotify_id, score")
        .eq("user_id", user.id)
        .in("track_spotify_id", trackIds),
      supabase
        .from("playlist_ratings")
        .select("subjective_score, note")
        .eq("user_id", user.id)
        .eq("playlist_spotify_id", playlist.id)
        .single(),
    ]);

    for (const r of trackRatings ?? []) {
      initialTrackScores[r.track_spotify_id] = Number(r.score);
    }
    if (playlistRating) {
      initialSubjectiveScore = Number(playlistRating.subjective_score);
      initialNote = playlistRating.note;
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
      <div className="mb-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-600/20 border border-blue-500/30 text-[10px] font-bold text-blue-300 uppercase tracking-wide">
        Playlist rating
      </div>
      {!user && (
        <p className="mb-4 text-xs text-amber-300 bg-amber-950/30 border border-amber-900/40 rounded-lg px-3 py-2">
          You&apos;re browsing as a guest — <Link href="/auth/login" className="underline">sign in</Link> to save
          your ratings.
        </p>
      )}
      {spotifyTracks.length === 0 && (
        <p className="mb-4 text-xs text-amber-300 bg-amber-950/30 border border-amber-900/40 rounded-lg px-3 py-2">
          The track list of this playlist isn&apos;t available — Spotify restricts playlist contents for
          apps in development mode (quota not extended). You can still rate the playlist below with the
          overall (subjective) rating.
        </p>
      )}
      <RatingForm
        kind="playlist"
        title={playlist.name}
        subtitle={`by ${playlist.owner_name} · ${playlist.total_tracks ?? spotifyTracks.length} tracks`}
        coverUrl={playlist.images[0]?.url ?? null}
        tracks={tracks}
        initialTrackScores={initialTrackScores}
        initialSubjectiveScore={initialSubjectiveScore}
        initialNote={initialNote}
        target={{
          kind: "playlist",
          playlistId: playlist.id,
          playlistName: playlist.name,
          ownerName: playlist.owner_name,
          coverUrl: playlist.images[0]?.url ?? null,
        }}
        allowSubjectiveOnly
      />
      {user && groups.length > 0 && (
        <div className="mt-6">
          <GroupRatingsPanel
            groups={groups}
            kind="playlist"
            targetId={playlist.id}
            tracks={tracks.map((t) => ({ id: t.id, name: t.name }))}
          />
        </div>
      )}
    </div>
  );
}
