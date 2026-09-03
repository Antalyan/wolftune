"use client";

import { useEffect, useState } from "react";

export default function RatePage() {
  const [trackName, setTrackName] = useState<string>("");
  const [score, setScore] = useState(8);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const track = params.get("track");
    if (track) setTrackName(track);
  }, []);

  return (
    <div className="max-w-md mx-auto px-4 py-10 w-full">
      <h1 className="text-2xl font-bold text-white mb-1">Rate a Track</h1>
      <p className="text-xs text-zinc-400 mb-6">Share your score with the wolfpack.</p>

      <div className="bg-night-800/80 border border-night-700 rounded-2xl p-6">
        <label className="block text-xs font-medium text-zinc-400 mb-2">Track Name</label>
        <input
          type="text"
          value={trackName}
          onChange={(e) => setTrackName(e.target.value)}
          placeholder="e.g. Blinding Lights"
          className="w-full bg-night-900 border border-night-700 rounded-xl p-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 mb-5"
        />

        <label className="block text-xs font-medium text-zinc-400 mb-2">
          Score: <span className="text-emerald-400 font-bold">{score} / 10</span>
        </label>
        <input
          type="range"
          min="1"
          max="10"
          step="0.5"
          value={score}
          onChange={(e) => setScore(parseFloat(e.target.value))}
          className="w-full accent-emerald-500 mb-5"
        />

        <label className="block text-xs font-medium text-zinc-400 mb-2">Your Review</label>
        <textarea
          rows={4}
          placeholder="Why did you give this score? What stood out?"
          className="w-full bg-night-900 border border-night-700 rounded-xl p-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 mb-6"
        />

        <button
          type="button"
          className="w-full py-3 rounded-xl bg-spotify-green hover:bg-spotify-bright text-night-950 font-bold text-sm transition-colors"
        >
          Submit Rating
        </button>
      </div>
    </div>
  );
}