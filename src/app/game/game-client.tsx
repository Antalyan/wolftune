"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Headphones,
  Flame,
  Trophy,
  ListMusic,
  Pencil,
  Eye,
  History as HistoryIcon,
} from "lucide-react";
import type { SpotifyTrack } from "@/types/spotify";
import { WolfMascot } from "@/components/WolfMascot";
import { useSpotifyPlayer } from "@/components/SpotifyPlayerProvider";
import {
  fuzzyMatch,
  matchesArtist,
  weightedPick,
  evaluateRound,
  createEmptySessionStats,
  recordRound,
  type TrackWithDifficulty,
  type SessionStats,
} from "@/lib/game";

type GamePhase = "select" | "playing" | "reveal" | "override";
type GameMode = "type_match" | "self_assessment";

interface PlaylistOption {
  id: string;
  name: string;
  owner_name: string;
  total_tracks: number | null;
}

export default function GameClient() {
  const { playSnippet, stop: stopFullTrack, pause: pauseFullTrack, resume: resumeFullTrack } = useSpotifyPlayer();

  // Playlist selection
  const [playlists, setPlaylists] = useState<PlaylistOption[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(true);
  const [playlistsError, setPlaylistsError] = useState<string | null>(null);

  // Game state
  const [selectedPlaylist, setSelectedPlaylist] = useState<PlaylistOption | null>(null);
  const [trackPool, setTrackPool] = useState<TrackWithDifficulty[]>([]);
  const [poolLoading, setPoolLoading] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [currentDifficulty, setCurrentDifficulty] = useState(2);

  // Round state
  const [phase, setPhase] = useState<GamePhase>("select");
  const [mode, setMode] = useState<GameMode>("type_match");
  const [songInput, setSongInput] = useState("");
  const [artistInput, setArtistInput] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Evaluation
  const [songCorrect, setSongCorrect] = useState(false);
  const [artistCorrect, setArtistCorrect] = useState(false);
  const [newDifficulty, setNewDifficulty] = useState(2);
  const [outcome, setOutcome] = useState<"both_correct" | "one_correct" | "both_wrong">("both_correct");

  /** Latest pool snapshot for stale-closure-proof round advancement. */
  const trackPoolRef = useRef<TrackWithDifficulty[]>([]);
  useEffect(() => {
    trackPoolRef.current = trackPool;
  }, [trackPool]);

  // Self-assessment
  const [selfSongKnew, setSelfSongKnew] = useState<boolean | null>(null);
  const [selfArtistKnew, setSelfArtistKnew] = useState<boolean | null>(null);

  // Session stats
  const [stats, setStats] = useState<SessionStats>(createEmptySessionStats());

  // Load playlists on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/playlists/own", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load playlists");
        const data = await res.json();
        if (cancelled) return;
        setPlaylists(data.playlists ?? []);
      } catch (e) {
        if (!cancelled) setPlaylistsError(e instanceof Error ? e.message : "Failed to load playlists");
      } finally {
        if (!cancelled) setPlaylistsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Pick the next track using weighted random
  const playPreviewFallback = useCallback((track: SpotifyTrack) => {
    audioRef.current?.pause();
    if (!track.preview_url) {
      setIsPlaying(false);
      return;
    }
    const audio = new Audio(track.preview_url);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audioRef.current = audio;
    audio.play();
  }, []);

  /** Toggle pause/resume of the current playback (full-track or fallback). */
  const togglePause = useCallback(() => {
    const fallback = audioRef.current;
    if (fallback && !fallback.paused) {
      fallback.pause();
      setIsPlaying(false);
      return;
    }
    if (fallback && fallback.paused && fallback.src) {
      void fallback.play().then(
        () => setIsPlaying(true),
        () => setIsPlaying(false)
      );
      return;
    }
    if (isPlaying) {
      setIsPlaying(false);
      void pauseFullTrack();
    } else {
      setIsPlaying(true);
      void resumeFullTrack();
    }
  }, [isPlaying, pauseFullTrack, resumeFullTrack]);

  const pickNextTrack = useCallback((pool: TrackWithDifficulty[]) => {
    if (pool.length === 0) return;
    const { item } = weightedPick(pool);
    setCurrentTrack(item.track);
    setCurrentDifficulty(item.difficulty);
    setPhase("playing");
    setSongInput("");
    setArtistInput("");
    setSelfSongKnew(null);
    setSelfArtistKnew(null);

    setIsPlaying(false);
    void stopFullTrack();
    audioRef.current = null; // full-track playback becomes the active source

    // Prefer full-track playback via the Web Playback SDK (user's Spotify
    // session). Falls back to the 30s preview URL when the SDK isn't available
    // (no Premium / not signed in) or the track has no embeddable URI.
    const track = item.track;
    if (track.uri) {
      // No durationMs → plays the whole song; the user controls stop/reveal.
      void playSnippet(track.uri).then(
        () => setIsPlaying(true),
        () => {
          // SDK not ready / Premium missing — try the preview URL below.
          void playPreviewFallback(track);
        }
      );
    } else {
      void playPreviewFallback(track);
    }
  }, [stopFullTrack, playSnippet, playPreviewFallback]);

  // Start a game with the selected playlist
  const startGame = useCallback(async (playlist: PlaylistOption) => {
    setSelectedPlaylist(playlist);
    setPoolLoading(true);
    setStats(createEmptySessionStats());
    try {
      const res = await fetch(`/api/playlists/${playlist.id}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load playlist tracks");
      const data = await res.json();
      const tracks: SpotifyTrack[] = data.tracks ?? [];

      // Load difficulty for each track
      const diffRes = await fetch(`/api/game/difficulty?track_ids=${tracks.map((t) => t.id).join(",")}`, {
        cache: "no-store",
      });
      const diffData: Record<string, number> = diffRes.ok ? await diffRes.json() : {};

      const pool: TrackWithDifficulty[] = tracks.map((t) => ({
        track: t,
        difficulty: diffData[t.id] ?? 2,
      }));

      setTrackPool(pool);
      setPhase("playing");
      pickNextTrack(pool);
    } catch (e) {
      setPlaylistsError(e instanceof Error ? e.message : "Failed to start game");
    } finally {
      setPoolLoading(false);
    }
  }, [pickNextTrack]);

  // Stop audio
  const stopAudio = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    void stopFullTrack();
    setIsPlaying(false);
  }, [stopFullTrack]);

  // Type & Match: submit answer
  const submitTypeMatch = useCallback(() => {
    if (!currentTrack) return;
    stopAudio();

    const sCorrect = fuzzyMatch(songInput, currentTrack.name);
    const aCorrect = matchesArtist(artistInput, currentTrack.artists);

    setSongCorrect(sCorrect);
    setArtistCorrect(aCorrect);

    const result = evaluateRound(currentDifficulty, sCorrect, aCorrect);
    setNewDifficulty(result.newDifficulty);
    setOutcome(result.outcome);
    setPhase("reveal");
  }, [currentTrack, songInput, artistInput, currentDifficulty, stopAudio]);

  // Self-Assessment: reveal answer
  const revealAnswer = useCallback(() => {
    stopAudio();
    setPhase("reveal");
  }, [stopAudio]);

  // Self-Assessment: submit self-report
  const submitSelfAssessment = useCallback(() => {
    if (!currentTrack || selfSongKnew === null || selfArtistKnew === null) return;

    const result = evaluateRound(currentDifficulty, selfSongKnew, selfArtistKnew);
    setSongCorrect(selfSongKnew);
    setArtistCorrect(selfArtistKnew);
    setNewDifficulty(result.newDifficulty);
    setOutcome(result.outcome);
    setPhase("override");
  }, [currentTrack, selfSongKnew, selfArtistKnew, currentDifficulty]);

  // Save result and move to next round
  const confirmResult = useCallback(async (override?: { song: boolean; artist: boolean; difficulty: number }) => {
    if (!currentTrack || !selectedPlaylist) return;

    const finalSongCorrect = override?.song ?? songCorrect;
    const finalArtistCorrect = override?.artist ?? artistCorrect;
    const finalDifficulty = override?.difficulty ?? newDifficulty;

    // Persist best-effort WITHOUT awaiting it — the round must advance and
    // stats must update instantly even if the request is slow or fails.
    void fetch("/api/game/result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trackId: currentTrack.id,
        trackName: currentTrack.name,
        artistName: currentTrack.artists[0]?.name ?? "Unknown",
        albumName: currentTrack.album?.name ?? null,
        coverUrl: currentTrack.album?.images?.[0]?.url ?? null,
        songCorrect: finalSongCorrect,
        artistCorrect: finalArtistCorrect,
        newDifficulty: finalDifficulty,
        mode,
      }),
    }).catch(() => {
      // Ignore save errors — the game continues and session stats still update.
    });

    // Update session stats immediately (before any network round-trip).
    setStats((prev) => recordRound(prev, currentTrack, finalSongCorrect, finalArtistCorrect));

    // Update the local pool difficulty and pick the next track from the
    // FRESH pool (functional update — no stale closure).
    let nextPool: TrackWithDifficulty[] = [];
    setTrackPool((prev) => {
      nextPool = prev.map((t) =>
        t.track.id === currentTrack.id ? { ...t, difficulty: finalDifficulty } : t
      );
      return nextPool;
    });

    // Next round
    pickNextTrack(nextPool.length > 0 ? nextPool : trackPoolRef.current);
  }, [currentTrack, selectedPlaylist, songCorrect, artistCorrect, newDifficulty, mode, pickNextTrack]);

  // Open override modal
  const openOverride = useCallback(() => {
    setPhase("override");
  }, []);

  // End game and go back to selection
  const endGame = useCallback(() => {
    stopAudio();
    setSelectedPlaylist(null);
    setTrackPool([]);
    setCurrentTrack(null);
    setPhase("select");
    setStats(createEmptySessionStats());
  }, [stopAudio]);

  // ---- RENDER ----

  if (phase === "select") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 w-full">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-extrabold text-white">Guessing Game</h1>
          <Link
            href="/game/history"
            className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
          >
            <HistoryIcon className="w-3.5 h-3.5" /> History
          </Link>
        </div>
        <p className="text-sm text-zinc-400 mb-6">Pick a playlist to start guessing. Tracks you struggle with appear more often.</p>

        {playlistsLoading && <p className="text-zinc-400">Loading playlists...</p>}
        {playlistsError && <p className="text-red-400">{playlistsError}</p>}

        <div className="space-y-2">
          {playlists.map((p) => (
            <button
              key={p.id}
              disabled={poolLoading}
              onClick={() => startGame(p)}
              className="w-full flex items-center gap-3 p-4 rounded-xl bg-night-800/80 border border-night-700 hover:border-emerald-700/50 transition-colors text-left disabled:opacity-50"
            >
              <ListMusic className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white truncate">{p.name}</div>
                <div className="text-xs text-zinc-400">
                  by {p.owner_name} {p.total_tracks !== null && `· ${p.total_tracks} tracks`}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 w-full flex flex-col items-center">
      {/* Header */}
      <div className="w-full flex justify-between items-center bg-night-800 border border-night-700 rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <span className="text-xs text-zinc-400">Accuracy:</span>
          <span className="text-base font-extrabold text-white">
            {stats.totalRounds > 0 ? Math.round((stats.correctRounds / stats.totalRounds) * 100) : 0}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          <span className="text-xs text-zinc-400">Rounds:</span>
          <span className="text-base font-extrabold text-emerald-400">{stats.totalRounds}</span>
        </div>
        <button onClick={endGame} className="text-xs text-zinc-400 hover:text-white">
          End Game
        </button>
      </div>

      {/* Playlist info */}
      <div className="text-center mb-4">
        <div className="text-xs text-zinc-500">Playing from</div>
        <div className="text-sm font-semibold text-white">{selectedPlaylist?.name}</div>
      </div>

      {/* Mode selector */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode("type_match")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            mode === "type_match" ? "bg-blue-600 text-white" : "bg-night-800 border border-night-700 text-zinc-400"
          }`}
        >
          <Pencil className="w-3.5 h-3.5" /> Type & Match
        </button>
        <button
          onClick={() => setMode("self_assessment")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            mode === "self_assessment" ? "bg-blue-600 text-white" : "bg-night-800 border border-night-700 text-zinc-400"
          }`}
        >
          <Eye className="w-3.5 h-3.5" /> Self-Assessment
        </button>
      </div>

      {/* Game arena */}
      <div className="relative flex flex-col items-center bg-night-800/80 border border-night-700 rounded-3xl p-8 w-full mb-6">
        <div className="p-4 rounded-2xl bg-night-900 border border-blue-800/50 mb-4">
          <WolfMascot
            size={80}
            mood={phase === "reveal" ? (songCorrect && artistCorrect ? "howling" : "cool") : "listening"}
          />
        </div>

        {/* Audio status */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600/10 border border-blue-500/30 text-blue-400 text-xs font-semibold mb-6">
          <Headphones className={`w-4 h-4 ${isPlaying ? "animate-pulse" : ""}`} />
          <span>{isPlaying ? "Playing..." : "Not playing"}</span>
        </div>

        {/* Playback controls */}
        {phase === "playing" && currentTrack && (
          <div className="flex items-center gap-3 mb-4">
            <button
              type="button"
              onClick={togglePause}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                isPlaying
                  ? "bg-night-800 border border-night-700 hover:border-night-500 text-zinc-300"
                  : "bg-blue-600 hover:bg-blue-500 text-white"
              }`}
            >
              {isPlaying ? "Pause" : "Resume"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                void stopFullTrack();
                pickNextTrack(trackPool);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
            >
              Skip
            </button>
            {!currentTrack.preview_url && (
              <span className="text-[11px] text-zinc-500">No audio preview for this track.</span>
            )}
          </div>
        )}

        {/* Type & Match input */}
        {phase === "playing" && mode === "type_match" && (
          <div className="w-full space-y-3">
            <input
              type="text"
              value={songInput}
              onChange={(e) => setSongInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && songInput.trim() && artistInput.trim()) submitTypeMatch();
              }}
              placeholder="Song name..."
              className="w-full px-4 py-3 rounded-xl bg-night-900 border border-night-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={artistInput}
              onChange={(e) => setArtistInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && songInput.trim() && artistInput.trim()) submitTypeMatch();
              }}
              placeholder="Artist name..."
              className="w-full px-4 py-3 rounded-xl bg-night-900 border border-night-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={submitTypeMatch}
              disabled={!songInput.trim() || !artistInput.trim()}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm"
            >
              Submit Guess
            </button>
          </div>
        )}

        {/* Self-Assessment: playing */}
        {phase === "playing" && mode === "self_assessment" && (
          <button
            onClick={revealAnswer}
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm"
          >
            Reveal Answer
          </button>
        )}

        {/* Reveal */}
        {phase === "reveal" && currentTrack && (
          <div className="w-full text-center space-y-4">
            <div>
              <div className="text-xs text-zinc-500">Song</div>
              <div className="text-lg font-bold text-white">{currentTrack.name}</div>
              {mode === "type_match" && (
                <div className={`text-xs mt-1 ${songCorrect ? "text-emerald-400" : "text-red-400"}`}>
                  Your guess: {songInput} {songCorrect ? "✓" : "✗"}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-zinc-500">Artist</div>
              <div className="text-lg font-bold text-white">{currentTrack.artists[0]?.name}</div>
              {mode === "type_match" && (
                <div className={`text-xs mt-1 ${artistCorrect ? "text-emerald-400" : "text-red-400"}`}>
                  Your guess: {artistInput} {artistCorrect ? "✓" : "✗"}
                </div>
              )}
            </div>

            {/* Self-Assessment: report */}
            {mode === "self_assessment" && (
              <div className="space-y-3 pt-4 border-t border-night-700">
                <div>
                  <div className="text-xs text-zinc-400 mb-2">Did you know the song name?</div>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => setSelfSongKnew(true)}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold ${
                        selfSongKnew === true ? "bg-emerald-600 text-white" : "bg-night-900 border border-night-700 text-zinc-400"
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setSelfSongKnew(false)}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold ${
                        selfSongKnew === false ? "bg-red-600 text-white" : "bg-night-900 border border-night-700 text-zinc-400"
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-400 mb-2">Did you know the artist?</div>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => setSelfArtistKnew(true)}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold ${
                        selfArtistKnew === true ? "bg-emerald-600 text-white" : "bg-night-900 border border-night-700 text-zinc-400"
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setSelfArtistKnew(false)}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold ${
                        selfArtistKnew === false ? "bg-red-600 text-white" : "bg-night-900 border border-night-700 text-zinc-400"
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
                <button
                  onClick={submitSelfAssessment}
                  disabled={selfSongKnew === null || selfArtistKnew === null}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm"
                >
                  Submit
                </button>
              </div>
            )}

            {/* Type & Match: show outcome and actions */}
            {mode === "type_match" && (
              <div className="space-y-3 pt-4 border-t border-night-700">
                <div className="text-xs text-zinc-400">
                  Outcome: <span className="text-white font-semibold">{outcome.replace("_", " ")}</span>
                  {" · "}New difficulty: <span className="text-white font-semibold">{newDifficulty}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => confirmResult()}
                    className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm"
                  >
                    Confirm & Next
                  </button>
                  <button
                    onClick={openOverride}
                    className="px-4 py-3 rounded-xl bg-night-900 border border-night-700 text-zinc-300 text-xs font-semibold"
                  >
                    Override
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Override modal inline */}
        {phase === "override" && currentTrack && (
          <div className="w-full space-y-4">
            <h3 className="text-sm font-bold text-white text-center">Override Priority</h3>
            <p className="text-xs text-zinc-400 text-center">
              Adjust the result before saving. Current: {outcome.replace("_", " ")}
            </p>

            <div className="flex gap-4 justify-center">
              <label className="flex items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={songCorrect}
                  onChange={(e) => setSongCorrect(e.target.checked)}
                  className="rounded"
                />
                Song correct
              </label>
              <label className="flex items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={artistCorrect}
                  onChange={(e) => setArtistCorrect(e.target.checked)}
                  className="rounded"
                />
                Artist correct
              </label>
            </div>

            <div>
              <label className="text-xs text-zinc-400">Difficulty: {newDifficulty}</label>
              <input
                type="range"
                min={1}
                max={10}
                value={newDifficulty}
                onChange={(e) => setNewDifficulty(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <button
              onClick={() => confirmResult({ song: songCorrect, artist: artistCorrect, difficulty: newDifficulty })}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm"
            >
              Save & Next
            </button>
          </div>
        )}
      </div>

      {/* Session stats */}
      {stats.totalRounds > 0 && (
        <div className="w-full bg-night-800/60 border border-night-700 rounded-2xl p-4">
          <h3 className="text-sm font-bold text-white mb-3">Session Stats</h3>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-zinc-400 mb-1">By Artist</div>
              {Object.entries(stats.byAuthor).slice(0, 5).map(([name, s]) => (
                <div key={name} className="flex justify-between text-zinc-300">
                  <span className="truncate mr-2">{name}</span>
                  <span className="text-emerald-400">{s.correct}/{s.correct + s.incorrect}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="text-zinc-400 mb-1">By Song</div>
              {Object.entries(stats.bySong).slice(0, 5).map(([name, s]) => (
                <div key={name} className="flex justify-between text-zinc-300">
                  <span className="truncate mr-2">{name}</span>
                  <span className="text-emerald-400">{s.correct}/{s.correct + s.incorrect}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
