import { Trophy, Medal, Crown } from "lucide-react";

const mockLeaderboard = [
  { rank: 1, user: "MelodyMaster", score: 12450, streak: 32, avatar: "https://i.pravatar.cc/150?img=15" },
  { rank: 2, user: "WolfHoller", score: 11800, streak: 27, avatar: "https://i.pravatar.cc/150?img=8" },
  { rank: 3, user: "SonicPup", score: 10950, streak: 21, avatar: "https://i.pravatar.cc/150?img=47" },
  { rank: 4, user: "BassHunter", score: 9200, streak: 15, avatar: "https://i.pravatar.cc/150?img=22" },
  { rank: 5, user: "RhythmWolf", score: 8500, streak: 12, avatar: "https://i.pravatar.cc/150?img=59" },
];

export default function LeaderboardPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-400" /> Leaderboard
        </h1>
        <p className="text-xs text-zinc-400">Top WolfTune players this week.</p>
      </div>

      <div className="space-y-3">
        {mockLeaderboard.map((player) => {
          const isTop = player.rank === 1;
          const isSecond = player.rank === 2;
          const isThird = player.rank === 3;
          return (
            <div
              key={player.rank}
              className={`flex items-center gap-4 p-4 rounded-2xl border transition-colors ${
                isTop
                  ? "bg-gradient-to-r from-yellow-500/10 to-blue-500/5 border-yellow-500/30"
                  : "bg-night-800/80 border-night-700"
              }`}
            >
              <div className="w-8 h-8 flex items-center justify-center">
                {isTop ? (
                  <Crown className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                ) : isSecond ? (
                  <Medal className="w-5 h-5 text-zinc-300 fill-zinc-300" />
                ) : isThird ? (
                  <Medal className="w-5 h-5 text-amber-600 fill-amber-600" />
                ) : (
                  <span className="text-xs font-bold text-zinc-500">{player.rank}</span>
                )}
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={player.avatar} alt={player.user} className="w-9 h-9 rounded-full border border-night-700" />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold truncate ${isTop ? "text-white" : "text-zinc-200"}`}>{player.user}</p>
                <p className="text-[11px] text-emerald-400">{player.streak} game streak</p>
              </div>
              <span className="text-sm font-extrabold text-blue-400">{player.score.toLocaleString()} pts</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}