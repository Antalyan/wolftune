import Link from "next/link";
import { WolfMascot } from "@/components/WolfMascot";
import { Headphones, Star, Sparkles, Flame, Play, Music2, ArrowRight } from "lucide-react";

const featuredTracks = [
  { title: "Blinding Lights", artist: "The Weeknd", cover: "https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36", rating: 9.4 },
  { title: "Starboy", artist: "The Weeknd, Daft Punk", cover: "https://i.scdn.co/image/ab67616d0000b2734718e2b124f79258be7bc452", rating: 9.1 },
  { title: "As It Was", artist: "Harry Styles", cover: "https://i.scdn.co/image/ab67616d0000b2732e8f6371050e04e76ea0dd79", rating: 8.8 },
  { title: "Midnight City", artist: "M83", cover: "https://i.scdn.co/image/ab67616d0000b27396c0926c48fb07d1302c3be9", rating: 9.6 },
];

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero */}
      <section className="relative w-full py-16 sm:py-20 px-4 max-w-4xl mx-auto text-center overflow-hidden">
        <div className="absolute inset-0 bg-grid-faint pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="absolute top-1/2 left-2/3 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative animate-fade-up inline-flex items-center gap-2 px-3 py-1 rounded-full bg-night-800/80 border border-blue-500/30 text-xs font-semibold text-blue-400 mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Wolfpack Music Community</span>
        </div>

        <div className="relative flex flex-col items-center mb-6">
          <div className="animate-fade-up delay-75 flex justify-center">
            <div className="animate-float p-3 rounded-3xl bg-night-800 border border-blue-700/40 shadow-xl shadow-blue-950/40">
              <WolfMascot size={96} mood="listening" />
            </div>
          </div>

          <h1 className="animate-fade-up delay-150 text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
            Rate your favorites. <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
              Guess the tunes.
            </span>
          </h1>

          <p className="animate-fade-up delay-300 mt-3 text-sm sm:text-base text-zinc-400 max-w-lg leading-relaxed">
            Explore the music catalog, rate tracks &amp; albums, write reviews, and test your
            musical ear with fast-paced snippet guessing games.
          </p>
        </div>

        <div className="animate-fade-up delay-450 flex flex-wrap justify-center gap-3">
          <Link
            href="/game"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/25 transition-all"
          >
            <Headphones className="w-4 h-4" /> Start Guessing Game <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/search"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-night-800 hover:bg-night-700/60 text-zinc-100 font-semibold text-sm border border-night-700 hover:border-blue-700/50 transition-all"
          >
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /> Search &amp; Rate Tracks
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full pt-10 text-left">
          <div className="p-4 rounded-xl bg-night-800/60 border border-night-700 hover:border-blue-700/50 transition-colors">
            <Music2 className="w-5 h-5 text-emerald-400 mb-2" />
            <h3 className="font-bold text-white text-sm">Spotify Catalog</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">Search tracks &amp; preview 30s audio clips.</p>
          </div>
          <div className="p-4 rounded-xl bg-night-800/60 border border-night-700 hover:border-blue-700/50 transition-colors">
            <Star className="w-5 h-5 text-spotify-bright mb-2" />
            <h3 className="font-bold text-white text-sm">Rate &amp; Review</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">Score 1–10 and post reviews for the pack.</p>
          </div>
          <div className="p-4 rounded-xl bg-night-800/60 border border-night-700 hover:border-blue-700/50 transition-colors">
            <Headphones className="w-5 h-5 text-blue-400 mb-2" />
            <h3 className="font-bold text-white text-sm">Guess Game</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">Snippet audio quiz with streaks &amp; leaderboards.</p>
          </div>
        </div>
      </section>
{/* Popular tracks preview */}
      <section className="w-full max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-red-400" />
            <h2 className="text-lg font-bold text-white">Popular Tracks</h2>
          </div>
          <Link href="/search" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
            View All →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {featuredTracks.map((track, i) => (
            <div
              key={i}
              className="bg-night-800/70 border border-night-700 rounded-xl p-3 flex flex-col justify-between hover:border-blue-700/50 transition-all"
            >
              <div className="relative aspect-square w-full rounded-lg overflow-hidden mb-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={track.cover} alt={track.title} className="w-full h-full object-cover" />
                <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-bold text-yellow-400">
                  ★ {track.rating}
                </span>
              </div>
              <h3 className="font-bold text-white text-xs truncate">{track.title}</h3>
              <p className="text-[11px] text-zinc-400 truncate">{track.artist}</p>
              <div className="mt-2 pt-2 border-t border-night-700 flex justify-between items-center text-[11px]">
                <Link href={`/search?q=${encodeURIComponent(track.title)}`} className="text-blue-400 hover:text-blue-300 transition-colors">
                  Rate
                </Link>
                <Link href="/game" className="text-emerald-400 font-bold flex items-center gap-0.5 hover:text-emerald-300 transition-colors">
                  <Play className="w-3 h-3 fill-current" /> Play
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}