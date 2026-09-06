import { WolfMascot } from "@/components/WolfMascot";
import { Music, Star, Trophy } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10 w-full">
      <div className="flex flex-col items-center text-center mb-8">
        <div className="p-4 rounded-2xl bg-night-800 border border-blue-800/50 mb-4">
          <WolfMascot size={80} mood="howling" />
        </div>
        <h1 className="text-3xl font-extrabold text-white">About WolfTune</h1>
        <p className="text-sm text-zinc-400 mt-2 max-w-md">
          The music rating & guessing app for true music lovers. Discover, rate, and challenge yourself.
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-night-800/80 border border-night-700 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Music className="w-4 h-4 text-emerald-400" />
            <h2 className="font-bold text-white">Discover & Rate</h2>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Browse a vast music catalog powered by the Spotify Web API. Previews let you listen
            before you rate. Scores from 1 to 10 to explain your taste.
          </p>
        </div>

        <div className="bg-night-800/80 border border-night-700 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <h2 className="font-bold text-white">Compete & Guess</h2>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Test your ear with our snippet-guessing game. Listen to short audio previews, identify the track,
            build streaks, and climb the leaderboard.
          </p>
        </div>

        <div className="bg-night-800/80 border border-night-700 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-blue-400" />
            <h2 className="font-bold text-white">Join the Pack</h2>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Share your ratings and find your next favorite song through fellow WolfTuners.
          </p>
        </div>
      </div>
    </div>
  );
}