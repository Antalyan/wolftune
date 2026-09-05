"use client";

import { useMemo, useState } from "react";
import { Check, Play, Save, Square } from "lucide-react";
import { MIN_SCORE, MAX_SCORE, type RateActionResult } from "@/types/rating";
import { submitAlbumRating, submitPlaylistRating } from "@/app/rate/actions";

export interface RateableTrack {
  id: string;
  name: string;
  artistName: string;
  durationMs: number | null;
}

interface RatingFormProps {
  /** "album" shows the separate subjective album score; "playlist" likewise. */
  kind: "album" | "playlist";
  title: string;
  subtitle: string;
  coverUrl: string | null;
  tracks: RateableTrack[];
  /** Existing per-track scores (1 decimal), keyed by track id. */
  initialTrackScores: Record<string, number>;
  initialSubjectiveScore: number | null;
  initialNote: string | null;
  /**
   * Serializable target data — the form calls the appropriate server action
   * itself (functions cannot be passed from a Server Component to a Client
   * Component).
   */
  target:
    | { kind: "album"; albumId: string; albumName: string; artistName: string; coverUrl: string | null }
    | { kind: "playlist"; playlistId: string; playlistName: string; ownerName: string; coverUrl: string | null };
  /**
   * When the track list is unavailable (Spotify dev-mode restriction on
   * playlist items), allow saving with only the subjective overall rating.
   */
  allowSubjectiveOnly?: boolean;
}

/** Formats a score as "7.5" with exactly one decimal. */
function fmt(score: number): string {
  return score.toFixed(1);
}

function ScoreSlider({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={MIN_SCORE}
        max={MAX_SCORE}
        step={0.1}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-emerald-500"
        aria-label="Score"
      />
      <input
        type="number"
        min={MIN_SCORE}
        max={MAX_SCORE}
        step={0.1}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (Number.isFinite(v)) onChange(Math.min(MAX_SCORE, Math.max(MIN_SCORE, v)));
        }}
        className="w-16 bg-night-900 border border-night-700 rounded-lg px-2 py-1 text-sm text-white text-center font-mono focus:outline-none focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        aria-label="Score value"
      />
    </div>
  );
}

export function RatingForm({
  kind,
  title,
  subtitle,
  coverUrl,
  tracks,
  initialTrackScores,
  initialSubjectiveScore,
  initialNote,
  target,
  allowSubjectiveOnly = false,
}: RatingFormProps) {
  const [scores, setScores] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const t of tracks) {
      initial[t.id] = initialTrackScores[t.id] ?? 5.0;
    }
    return initial;
  });
  const [rated, setRated] = useState<Set<string>>(
    () => new Set(Object.keys(initialTrackScores))
  );
  const [subjective, setSubjective] = useState<number>(initialSubjectiveScore ?? 5.0);
  const [subjectiveRated, setSubjectiveRated] = useState(initialSubjectiveScore !== null);
  const [note, setNote] = useState(initialNote ?? "");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<RateActionResult | null>(null);
  /** Track currently expanded into an inline Spotify embed player (null = none). */
  const [playingId, setPlayingId] = useState<string | null>(null);

  const ratedTracks = useMemo(
    () => tracks.filter((t) => rated.has(t.id)),
    [tracks, rated]
  );

  /** Average is computed from per-song ratings ONLY — the subjective score
   *  of the album/playlist is intentionally excluded (per spec). */
  const average = useMemo(() => {
    if (ratedTracks.length === 0) return null;
    const sum = ratedTracks.reduce((acc, t) => acc + scores[t.id], 0);
    return sum / ratedTracks.length;
  }, [ratedTracks, scores]);

  const setTrackScore = (id: string, score: number) => {
    setScores((prev) => ({ ...prev, [id]: score }));
    setRated((prev) => new Set(prev).add(id));
  };

  const handleSubmit = async () => {
    setPending(true);
    setResult(null);
    try {
      const payload = {
        tracks: tracks
          .filter((t) => rated.has(t.id))
          .map((t) => ({ trackId: t.id, trackName: t.name, score: scores[t.id] })),
        subjectiveScore: subjectiveRated ? subjective : null,
        note: subjectiveRated ? note : null,
      };
      const res =
        target.kind === "album"
          ? await submitAlbumRating({
              albumId: target.albumId,
              albumName: target.albumName,
              artistName: target.artistName,
              coverUrl: target.coverUrl,
              ...payload,
            })
          : await submitPlaylistRating({
              playlistId: target.playlistId,
              playlistName: target.playlistName,
              ownerName: target.ownerName,
              coverUrl: target.coverUrl,
              ...payload,
            });
      setResult(res);
    } catch (err) {
      setResult({
        error: err instanceof Error ? err.message : "Unexpected error.",
        success: null,
      });
    } finally {
      setPending(false);
    }
  };

  const kindLabel = kind === "album" ? "album" : "playlist";

  return (
    <div className="space-y-6">
      {/* Header with live computed average */}
      <div className="bg-night-800/60 border border-night-700 rounded-xl p-4 flex items-center gap-4">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={title}
            className="w-16 h-16 rounded-lg object-cover bg-night-900 shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-night-900 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-white truncate">{title}</h1>
          <p className="text-xs text-zinc-400 truncate">{subtitle}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {average !== null ? fmt(average) : "—"}
          </div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
            avg ({ratedTracks.length}/{tracks.length} songs)
          </div>
        </div>
      </div>

      {/* Per-song ratings */}
      <div className="bg-night-800/60 border border-night-700 rounded-xl p-4">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-zinc-300">
            Rate each song ({MIN_SCORE}–{MAX_SCORE}, one decimal)
          </h2>
        </div>
        <div className="space-y-4">
          {tracks.map((t) => (
            <div key={t.id} className="flex flex-col gap-1.5">
              {/* Inline Spotify embed player — plays the full track, no auth needed */}
              {playingId === t.id && (
                <iframe
                  title={`Spotify player: ${t.name}`}
                  src={`https://open.spotify.com/embed/track/${t.id}?utm_source=wolftune&theme=0&autoplay=1`}
                  width="100%"
                  height="80"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="rounded-lg overflow-hidden"
                />
              )}
              {playingId === t.id && (
                <p className="text-[10px] text-zinc-500">
                  Hearing only 30 seconds? Log in to Spotify in this browser for full playback.
                </p>
              )}
              <div className="flex items-baseline justify-between gap-2">
                <span className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => setPlayingId((prev) => (prev === t.id ? null : t.id))}
                    title={playingId === t.id ? "Stop the player" : "Play the track"}
                    aria-label={playingId === t.id ? "Stop" : "Play"}
                    className="flex items-center justify-center w-7 h-7 rounded-lg bg-night-900 border border-night-700 hover:border-night-500 transition-colors shrink-0"
                  >
                    {playingId === t.id ? (
                      <Square className="w-3 h-3 text-spotify-green" />
                    ) : (
                      <Play className="w-3 h-3 text-white" />
                    )}
                  </button>
                  <span className="text-sm text-white truncate">
                    {t.name}
                    {!rated.has(t.id) && (
                      <span className="ml-2 text-[10px] text-zinc-500">not rated</span>
                    )}
                  </span>
                </span>
                <span className="text-xs text-zinc-400 truncate shrink-0">{t.artistName}</span>
              </div>
              <ScoreSlider
                value={scores[t.id]}
                onChange={(v) => setTrackScore(t.id, v)}
                disabled={pending}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Subjective overall rating — separate from the computed average */}
      <div className="bg-night-800/60 border border-night-700 rounded-xl p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <h2 className="text-sm font-semibold text-zinc-300">
              Overall {kindLabel} rating <span className="text-zinc-500">(subjective)</span>
            </h2>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              Kept separate — it does <strong>not</strong> affect the computed average above.
            </p>
          </div>
          <label className="flex items-center gap-1.5 text-xs text-zinc-400 shrink-0">
            <input
              type="checkbox"
              checked={subjectiveRated}
              disabled={pending}
              onChange={(e) => setSubjectiveRated(e.target.checked)}
              className="accent-emerald-500"
            />
            include
          </label>
        </div>
        {subjectiveRated && (
          <>
            <ScoreSlider value={subjective} onChange={setSubjective} disabled={pending} />
            <textarea
              rows={2}
              value={note}
              disabled={pending}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note — why this score?"
              className="mt-3 w-full bg-night-900 border border-night-700 rounded-lg p-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
          </>
        )}
      </div>

      {/* Feedback + submit */}
      {result?.error && (
        <p className="text-xs text-red-300 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">
          {result.error}
        </p>
      )}
      {result?.success && (
        <p className="text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-900/50 rounded-lg px-3 py-2 flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5" /> {result.success}
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={
          pending ||
          (ratedTracks.length === 0 && !(allowSubjectiveOnly && subjectiveRated))
        }
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-spotify-green hover:bg-spotify-bright text-night-950 font-bold text-sm transition-colors disabled:opacity-60"
      >
        <Save className="w-4 h-4" />
        {pending ? "Saving…" : "Save rating"}
      </button>
    </div>
  );
}
