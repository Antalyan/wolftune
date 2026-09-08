import { createClient } from "@/lib/supabase/server";
import { ensureTrackSnapshots } from "@/lib/catalog";
import { resolveSpotifyCredentials } from "@/lib/spotify-credentials";
import { getTracksByIds, SpotifyApiError } from "@/lib/spotify";
import { WolfMascot } from "@/components/WolfMascot";
import { Headphones } from "lucide-react";
import Link from "next/link";
import { HistoryClient } from "./history-client";

export const dynamic = "force-dynamic";

export interface GuessHistoryRow {
  trackId: string;
  name: string;
  artist: string;
  coverUrl: string | null;
  correct: number;
  incorrect: number;
  lastGuessedAt: string | null;
}

/** Fetches the signed-in user's per-track guessing history. */
async function getGuessHistory(): Promise<GuessHistoryRow[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: stats } = await supabase
    .from("user_track_stats")
    .select("track_spotify_id, times_correct, times_incorrect, last_guessed_at")
    .eq("user_id", user.id)
    .order("last_guessed_at", { ascending: false, nullsFirst: false });

  const rows = stats ?? [];
  if (rows.length === 0) return [];

  // Resolve track metadata (names come from the catalog snapshot).
  const trackIds = Array.from(new Set(rows.map((r) => r.track_spotify_id)));
  let { data: tracks } = await supabase
    .from("music_tracks")
    .select("spotify_id, name, artist_name, cover_url")
    .in("spotify_id", trackIds);

  // Backfill: tracks guessed before snapshot caching existed have no catalog
  // row ("Unknown track"). Fetch their metadata from Spotify once and cache it.
  const knownIds = new Set((tracks ?? []).map((t) => t.spotify_id));
  const missingIds = trackIds.filter((id) => !knownIds.has(id));
  if (missingIds.length > 0) {
    try {
      const { credentials } = await resolveSpotifyCredentials();
      if (credentials) {
        const fetched = await getTracksByIds(missingIds, credentials);
        await ensureTrackSnapshots(fetched);
        const refetch = await supabase
          .from("music_tracks")
          .select("spotify_id, name, artist_name, cover_url")
          .in("spotify_id", trackIds);
        if (!refetch.error) tracks = refetch.data;
      }
    } catch (err) {
      // Best-effort backfill — never block the history page.
      console.error(
        "[game-history] track backfill failed:",
        err instanceof SpotifyApiError || err instanceof Error ? err.message : err
      );
    }
  }
  const trackMap = new Map((tracks ?? []).map((t) => [t.spotify_id, t]));

  return rows.map((r) => {
    const t = trackMap.get(r.track_spotify_id);
    return {
      trackId: r.track_spotify_id,
      name: t?.name ?? "Unknown track",
      artist: t?.artist_name ?? "",
      coverUrl: t?.cover_url ?? null,
      correct: Number(r.times_correct),
      incorrect: Number(r.times_incorrect),
      lastGuessedAt: r.last_guessed_at,
    };
  });
}

export default async function GameHistoryPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <WolfMascot size={80} mood="listening" />
        <h2 className="mt-6 text-2xl font-bold text-white">Sign in to see your guessing history</h2>
      </div>
    );
  }

  const history = await getGuessHistory();
  const totalAttempts = history.reduce((sum, r) => sum + r.correct + r.incorrect, 0);
  const totalCorrect = history.reduce((sum, r) => sum + r.correct, 0);
  const accuracy = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 w-full">
      <div className="flex items-center gap-3 mb-2">
        <Headphones className="w-6 h-6 text-emerald-400" />
        <h1 className="text-2xl font-bold text-white">Guess History</h1>
      </div>

      <p className="text-xs text-zinc-400 mb-6">
        Every track you&apos;ve been quizzed on, with your correct/incorrect record.{" "}
        <Link href="/game" className="text-blue-400 hover:text-blue-300 underline">
          Back to the game →
        </Link>
      </p>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-night-800/60 border border-night-700 rounded-xl p-3 text-center">
          <div className="text-2xl font-extrabold text-white font-mono">{history.length}</div>
          <div className="text-[11px] text-zinc-400">Tracks attempted</div>
        </div>
        <div className="bg-night-800/60 border border-night-700 rounded-xl p-3 text-center">
          <div className="text-2xl font-extrabold text-white font-mono">{totalAttempts}</div>
          <div className="text-[11px] text-zinc-400">Total guesses</div>
        </div>
        <div className="bg-night-800/60 border border-night-700 rounded-xl p-3 text-center">
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">{accuracy.toFixed(0)}%</div>
          <div className="text-[11px] text-zinc-400">Accuracy</div>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-night-700 rounded-2xl">
          <WolfMascot size={70} mood="howling" />
          <p className="mt-4 text-sm text-zinc-400">No guesses yet.</p>
          <Link
            href="/game"
            className="mt-3 inline-block px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
          >
            Play a round
          </Link>
        </div>
      ) : (
        <HistoryClient initial={history} />
      )}
    </div>
  );
}
