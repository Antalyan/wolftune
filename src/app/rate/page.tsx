"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Disc3, ListMusic, Search as SearchIcon, User } from "lucide-react";
import type { SpotifyAlbumSummary, SpotifyPlaylistSummary } from "@/types/spotify";

interface RateSearchResponse {
  albums?: SpotifyAlbumSummary[];
  playlists?: SpotifyPlaylistSummary[];
  source?: "spotify" | "mock";
  missingReason?: string | null;
  error?: string;
}

interface OwnPlaylistsResponse {
  playlists?: SpotifyPlaylistSummary[];
  error?: string;
  code?: string;
}

export default function RatePage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [albums, setAlbums] = useState<SpotifyAlbumSummary[]>([]);
  const [playlists, setPlaylists] = useState<SpotifyPlaylistSummary[]>([]);
  const [ownPlaylists, setOwnPlaylists] = useState<SpotifyPlaylistSummary[]>([]);
  const [ownError, setOwnError] = useState<string | null>(null);
  const [ownLoading, setOwnLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load the signed-in user's own playlists (owner/co-creator) via their OAuth token.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/playlists/own", { cache: "no-store" });
        const data = (await res.json().catch(() => null)) as OwnPlaylistsResponse | null;
        if (cancelled) return;
        if (!res.ok) {
          setOwnPlaylists([]);
          setOwnError(
            data?.code === "NOT_CONNECTED"
              ? null // not connected — silent, the section simply won't show
              : (data?.error ?? "Could not load your playlists.")
          );
        } else {
          setOwnPlaylists(data?.playlists ?? []);
          setOwnError(null);
        }
      } catch {
        if (!cancelled) setOwnError("Could not load your playlists.");
      } finally {
        if (!cancelled) setOwnLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchResults = useCallback(async (q: string) => {
    if (!q.trim()) {
      setAlbums([]);
      setPlaylists([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q, types: "album,playlist" });
      const res = await fetch(`/api/search?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as RateSearchResponse | null;
        throw new Error(body?.error ?? `Search failed with status ${res.status}.`);
      }
      const data = (await res.json()) as RateSearchResponse;
      setAlbums(data.albums ?? []);
      setPlaylists(data.playlists ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected search error.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchResults(query), 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchResults]);

  const hasResults = albums.length > 0 || playlists.length > 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 w-full">
      <h1 className="text-2xl font-bold text-white mb-1">Rate music</h1>
      <p className="text-xs text-zinc-400 mb-6">
        Find an album or playlist and score every song from 1 to 10 (one decimal). You also give a
        separate subjective overall rating — it never affects the computed average.
      </p>

      <div className="relative mb-6">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search albums or playlists to rate…"
          maxLength={80}
          className="w-full bg-night-800 border border-night-700 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
        />
      </div>

      {loading && <p className="text-xs text-zinc-500 py-6 text-center">Searching…</p>}
      {error && (
        <p className="text-xs text-red-300 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {!loading && !error && query.trim() && !hasResults && (
        <p className="text-center text-zinc-500 py-10 text-sm">
          No albums or playlists found. Try a different query.
        </p>
      )}
      {!query.trim() && !ownLoading && ownPlaylists.length === 0 && !ownError && (
        <p className="text-center text-zinc-500 py-10 text-sm">
          Type above to find something from the Spotify catalog.
        </p>
      )}

      {/* Your own playlists (OAuth — owner or co-creator) */}
      {!query.trim() && (ownLoading || ownPlaylists.length > 0 || ownError) && (
        <section className="mb-6">
          <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-300 mb-3">
            <User className="w-4 h-4 text-spotify-green" /> Your playlists
          </h2>
          {ownLoading && <p className="text-xs text-zinc-500 py-3">Loading your playlists…</p>}
          {ownError && (
            <p className="text-xs text-amber-300 bg-amber-950/30 border border-amber-900/50 rounded-lg px-3 py-2">
              {ownError} You can{" "}
              <Link href="/settings" className="underline hover:text-amber-200">
                reconnect Spotify in Settings
              </Link>
              .
            </p>
          )}
          <div className="space-y-2">
            {ownPlaylists.map((p) => (
              <Link
                key={p.id}
                href={`/playlists/${p.id}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-night-800/80 border border-night-700 hover:border-emerald-700/50 transition-colors"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
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
          </div>
        </section>
      )}

      {albums.length > 0 && (
        <section className="mb-6">
          <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-300 mb-3">
            <Disc3 className="w-4 h-4 text-spotify-green" /> Albums
          </h2>
          <div className="space-y-2">
            {albums.map((a) => (
              <Link
                key={a.id}
                href={`/albums/${a.id}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-night-800/80 border border-night-700 hover:border-emerald-700/50 transition-colors"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.images[0]?.url ?? ""}
                  alt={a.name}
                  className="w-12 h-12 rounded-lg object-cover bg-night-900"
                />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{a.name}</div>
                  <div className="text-xs text-zinc-400 truncate">
                    {a.artists.map((ar) => ar.name).join(", ")} · {a.total_tracks} tracks
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {playlists.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-300 mb-3">
            <ListMusic className="w-4 h-4 text-spotify-green" /> Playlists
          </h2>
          <div className="space-y-2">
            {playlists.map((p) => (
              <Link
                key={p.id}
                href={`/playlists/${p.id}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-night-800/80 border border-night-700 hover:border-emerald-700/50 transition-colors"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
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
          </div>
        </section>
      )}
    </div>
  );
}
