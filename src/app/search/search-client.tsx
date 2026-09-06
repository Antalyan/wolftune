"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Disc3,
  FlaskConical,
  ListMusic,
  Music2,
  Play,
  Search as SearchIcon,
  Square,
  KeyRound,
} from "lucide-react";
import { SpotifySearchResults, SpotifySearchType, SpotifyTrack } from "@/types/spotify";

interface SearchApiResponse extends SpotifySearchResults {
  credentialStatus?: "ok" | "missing";
  missingReason?: string | null;
  credentialSource?: "user" | "group" | "env";
  groupName?: string | null;
}

const TYPE_META: Record<SpotifySearchType, { label: string; icon: typeof Music2 }> = {
  track: { label: "Songs", icon: Music2 },
  album: { label: "Albums", icon: Disc3 },
  playlist: { label: "Playlists", icon: ListMusic },
};

export default function SearchClient() {
  const [query, setQuery] = useState("");
  const [types, setTypes] = useState<SpotifySearchType[]>(["track", "album", "playlist"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchApiResponse | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Playback uses Spotify's official IFrame Embed player — it needs no Spotify
   * login at all and works for every user. `playingUrl` holds the embed track id.
   * (Full-track streaming via the Web Playback SDK would require signing in with
   * Spotify OAuth + Premium, which this app does not require.)
   */
  const toggleEmbed = useCallback((trackId: string) => {
    setPlayingUrl((prev) => (prev === trackId ? null : trackId));
  }, []);

  const toggleType = useCallback((t: SpotifySearchType) => {
    setTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }, []);

  const fetchResults = useCallback(async (q: string, activeTypes: SpotifySearchType[]) => {
    if (!q.trim()) {
      setResults(null);
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q,
        types: activeTypes.join(","),
      });
      const res = await fetch(`/api/search?${params.toString()}`, {
        signal: abortRef.current.signal,
        cache: "no-store",
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Search failed with status ${res.status}.`);
      }

      const data = (await res.json()) as SearchApiResponse;
      setResults(data);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Unexpected search error.");
    } finally {
      setLoading(false);
    }
  }, []);

  const submit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      fetchResults(query, types);
    },
    [query, types, fetchResults]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchResults(query, types), 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, types, fetchResults]);

  const showDemoPill = results?.source === "mock";
  const hasAnyResults =
    (results?.tracks.length ?? 0) +
      (results?.albums.length ?? 0) +
      (results?.playlists.length ?? 0) >
    0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Search</h1>
        <p className="text-sm text-zinc-400">
          Find songs, albums, and playlists — your results come from the real Spotify catalog.
        </p>
      </div>

      {/* Credential source indicator */}
      {results && results.credentialStatus === "ok" && results.credentialSource && (
        <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-night-800/80 border border-night-700 text-xs text-zinc-400">
          <KeyRound className="w-3.5 h-3.5 text-spotify-green" />
          {results.credentialSource === "user" && <span>Using your personal Spotify credentials.</span>}
          {results.credentialSource === "group" && (
            <span>Using credentials from group: <strong className="text-white">{results.groupName ?? "your group"}</strong></span>
          )}
          {results.credentialSource === "env" && <span>Using server default credentials.</span>}
        </div>
      )}

      {/* Demo data warning */}
      {showDemoPill && (
        <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-900/30 border border-amber-700/40 text-xs text-amber-200">
          <FlaskConical className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1">
            Showing demo data. Add your Spotify Developer credentials in{" "}
            <Link href="/settings" className="underline hover:text-white">
              Settings
            </Link>{" "}
            or join a{" "}
            <Link href="/groups" className="underline hover:text-white">
              group
            </Link>{" "}
            to search the real catalog.
          </span>
        </div>
      )}

      {/* Search form */}
      <form onSubmit={submit} className="mb-6">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs, albums, playlists…"
            maxLength={80}
            className="w-full bg-night-800 border border-night-700 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-wolf-500 transition-colors"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-lg bg-wolf-600 hover:bg-wolf-500 text-white text-xs font-bold transition-colors"
          >
            Search
          </button>
        </div>

        {/* Type toggles */}
        <div className="flex gap-2 mt-3">
          {(Object.keys(TYPE_META) as SpotifySearchType[]).map((t) => {
            const meta = TYPE_META[t];
            const Icon = meta.icon;
            const active = types.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleType(t)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  active
                    ? "bg-wolf-600/20 border border-wolf-500/40 text-wolf-300"
                    : "bg-night-800 border border-night-700 text-zinc-400 hover:border-night-600"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {meta.label}
              </button>
            );
          })}
        </div>
      </form>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-night-800/50 animate-pulse" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-950/50 border border-red-800/50 text-sm text-red-300 mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Results */}
      {!loading && results && (
        <div className="space-y-6">
          {results.tracks.length > 0 && (
            <Section title="Songs" icon={Music2}>
              {results.tracks.map((t) => (
                <TrackRow
                  key={t.id}
                  track={t}
                  isPlaying={playingUrl === t.id}
                  onTogglePlay={() => toggleEmbed(t.id)}
                />
              ))}
            </Section>
          )}

          {results.albums.length > 0 && (
            <Section title="Albums" icon={Disc3}>
              {results.albums.map((a) => (
                <Link
                  key={a.id}
                  href={`/albums/${a.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-night-800/80 border border-night-700 hover:border-wolf-700/50 transition-colors"
                >
                  <img
                    src={a.images[0]?.url ?? ""}
                    alt={a.name}
                    className="w-12 h-12 rounded-lg object-cover bg-night-900"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{a.name}</div>
                    <div className="text-xs text-zinc-400 truncate">{a.total_tracks} tracks</div>
                  </div>
                </Link>
              ))}
            </Section>
          )}

          {results.playlists.length > 0 && (
            <Section title="Playlists" icon={ListMusic}>
              {results.playlists.map((p) => (
                <Link
                  key={p.id}
                  href={`/playlists/${p.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-night-800/80 border border-night-700 hover:border-wolf-700/50 transition-colors"
                >
                  <img
                    src={p.images[0]?.url ?? ""}
                    alt={p.name}
                    className="w-12 h-12 rounded-lg object-cover bg-night-900"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{p.name}</div>
                    <div className="text-xs text-zinc-400 truncate">
                      by {p.owner_name}
                      {p.total_tracks !== null && ` · ${p.total_tracks} tracks`}
                    </div>
                  </div>
                </Link>
              ))}
            </Section>
          )}

          {!hasAnyResults && (
            <div className="text-center text-zinc-400 py-12">
              No results found. Try a different query.
            </div>
          )}
        </div>
      )}

      {/* Initial state */}
      {!loading && !error && !results && (
        <div className="text-center text-zinc-500 py-12">
          Type something above to search.
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Music2;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-300 mb-3">
        <Icon className="w-4 h-4 text-spotify-green" />
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function TrackRow({
  track,
  isPlaying,
  onTogglePlay,
}: {
  track: SpotifyTrack;
  isPlaying: boolean;
  onTogglePlay: () => void;
}) {
  return (
    <div className="rounded-xl bg-night-800/80 border border-night-700 hover:border-night-600 transition-colors overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <button
          type="button"
          onClick={onTogglePlay}
          title={isPlaying ? "Stop the preview player" : "Play the track (Spotify preview player)"}
          className="flex items-center justify-center w-10 h-10 rounded-lg bg-night-900 border border-night-700 hover:border-night-500 transition-colors shrink-0"
          aria-label={isPlaying ? "Stop" : "Play"}
        >
          {isPlaying ? (
            <Square className="w-4 h-4 text-spotify-green" />
          ) : (
            <Play className="w-4 h-4 text-white" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-white truncate">{track.name}</div>
          <div className="text-xs text-zinc-400 truncate">
            {track.artists.map((a) => a.name).join(", ")} · {track.album?.name}
          </div>
        </div>
      </div>
      {isPlaying && (
        <iframe
          title={`Spotify player: ${track.name}`}
          src={`https://open.spotify.com/embed/track/${track.id}?utm_source=wolftune&theme=0&autoplay=1`}
          width="100%"
          height="152"
          style={{ border: 0 }}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
      )}
      {isPlaying && (
        <p className="px-3 pb-2 text-[10px] text-zinc-500">
          Hearing only 30 seconds? Log in to Spotify in this browser for full playback.
        </p>
      )}
    </div>
  );
}
