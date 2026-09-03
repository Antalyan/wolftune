"use client";

import { useState, useEffect } from "react";
import { searchTracks } from "@/lib/spotify";
import { SpotifyTrack } from "@/types/spotify";
import { Play, Pause, Star, CheckCircle, Disc } from "lucide-react";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
  const [score, setScore] = useState<number>(8);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    handleSearch("The Weeknd").catch(() => setLoading(false));
  }, []);

  const handleSearch = async (searchTerm: string) => {
    setLoading(true);
    setTracks(await searchTracks(searchTerm));
    setLoading(false);
  };

  const toggleAudio = (track: SpotifyTrack) => {
    if (!track.preview_url) return;
    if (playingId === track.id) {
      audio?.pause();
      setPlayingId(null);
    } else {
      audio?.pause();
      const newAudio = new Audio(track.preview_url);
      newAudio.play().catch(() => {
        setPlayingId(null);
      });
      setAudio(newAudio);
      setPlayingId(track.id);
      newAudio.onended = () => setPlayingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Disc className="w-6 h-6 text-blue-500" /> Search & Rate Music
          </h1>
          <p className="text-xs text-zinc-400">Search songs, preview audio, and submit reviews.</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSearch(query).catch(() => setLoading(false)); }} className="flex gap-2 bg-night-800 border border-night-700 rounded-xl p-1.5 w-full md:w-72">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search song or artist..."
            className="bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none w-full px-2"
          />
          <button type="submit" className="px-3 py-1 bg-blue-600 text-xs font-semibold text-white rounded-lg">Search</button>
        </form>
      </div>

      {loading ? (
        <div className="text-center py-16 text-zinc-400 text-sm">Loading catalog...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tracks.map((track) => (
            <div key={track.id} className="bg-night-800/80 border border-night-700 rounded-xl p-3 flex gap-3 items-center justify-between">
              <div className="flex gap-2.5 items-center min-w-0">
                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-night-700 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={track.album.images[0]?.url} alt={track.name} className="w-full h-full object-cover" />
                  {track.preview_url && (
                    <button onClick={() => toggleAudio(track)} className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
                      {playingId === track.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                    </button>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-white text-xs truncate">{track.name}</h3>
                  <p className="text-[11px] text-zinc-400 truncate">{track.artists.map((a) => a.name).join(", ")}</p>
                </div>
              </div>

              <button onClick={() => setSelectedTrack(track)} className="shrink-0 flex items-center gap-1 px-2.5 py-1 bg-spotify-green/10 text-spotify-bright text-xs font-semibold rounded-lg border border-spotify-green/30">
                <Star className="w-3 h-3 fill-current" /> Rate
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedTrack && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-night-800 border border-night-700 rounded-2xl max-w-sm w-full p-5">
            <h2 className="text-base font-bold text-white mb-2">Rate {selectedTrack.name}</h2>
            {submitted ? (
              <div className="text-center py-6 text-emerald-400 text-xs font-semibold flex flex-col items-center gap-2">
                <CheckCircle className="w-8 h-8" /> Submitted to Wolfpack!
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); setTimeout(() => { setSubmitted(false); setSelectedTrack(null); }, 1200); }} className="space-y-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Score: {score} / 10</label>
                  <input type="range" min="1" max="10" step="0.5" value={score} onChange={(e) => setScore(parseFloat(e.target.value))} className="w-full accent-emerald-500" />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={() => setSelectedTrack(null)} className="px-3 py-1.5 text-xs text-zinc-400">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 bg-spotify-green hover:bg-spotify-bright text-night-950 text-xs font-bold rounded-lg">Save Rating</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}