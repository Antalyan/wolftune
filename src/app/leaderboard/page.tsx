import Link from "next/link";
import { Trophy, Crown, Medal, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserGroups, getGroupLeaderboard } from "@/lib/groups";
import { WolfMascot } from "@/components/WolfMascot";
import { GroupLeaderboardSwitcher } from "./group-switcher";

export const dynamic = "force-dynamic";

interface LeaderboardPageProps {
  searchParams?: { group?: string };
}

export default async function LeaderboardPage({ searchParams }: LeaderboardPageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <WolfMascot size={80} mood="listening" />
        <h2 className="mt-6 text-2xl font-bold text-white">Sign in to see the leaderboard</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Leaderboards are per-group — join a group to compare with your pack.
        </p>
      </div>
    );
  }

  const groups = await getUserGroups(supabase, user.id);
  const requested = searchParams?.group;
  const selectedGroupId =
    groups.find((g) => g.id === requested)?.id ?? groups[0]?.id ?? null;

  let entries: Awaited<ReturnType<typeof getGroupLeaderboard>> = [];
  let selectedGroupName: string | null = null;
  if (selectedGroupId) {
    const group = groups.find((g) => g.id === selectedGroupId);
    selectedGroupName = group?.name ?? null;
    entries = await getGroupLeaderboard(supabase, selectedGroupId);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-400" /> Group Leaderboard
        </h1>
        <p className="text-xs text-zinc-400">
          Members ranked by their average track rating.{" "}
          <Link href="/stats" className="text-blue-400 hover:text-blue-300 underline">
            Detailed statistics →
          </Link>
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-12">
          <WolfMascot size={70} mood="howling" />
          <p className="mt-4 text-sm text-zinc-400">You&apos;re not in any groups yet.</p>
          <Link
            href="/groups"
            className="mt-4 inline-block px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
          >
            Create or join a group
          </Link>
        </div>
      ) : (
        <>
          <GroupLeaderboardSwitcher
            groups={groups}
            selectedId={selectedGroupId}
          />

          {selectedGroupName && (
            <p className="mb-4 text-xs text-zinc-500">Showing: {selectedGroupName}</p>
          )}

          {entries.length === 0 ? (
            <div className="text-center py-10">
              <TrendingUp className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm text-zinc-400">
                No one has rated anything yet. Start rating to climb the leaderboard.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry, i) => {
                const isTop = i === 0;
                const isSecond = i === 1;
                const isThird = i === 2;
                return (
                  <div
                    key={entry.userId}
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
                        <span className="text-xs font-bold text-zinc-500">{i + 1}</span>
                      )}
                    </div>
                    <div className="w-9 h-9 rounded-full bg-night-700 overflow-hidden border border-night-700 shrink-0">
                      {entry.avatarUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={entry.avatarUrl}
                          alt={entry.username}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${isTop ? "text-white" : "text-zinc-200"}`}>
                        {entry.username}
                      </p>
                      <p className="text-[11px] text-emerald-400">
                        {entry.ratingsCount} {entry.ratingsCount === 1 ? "track" : "tracks"} rated
                      </p>
                    </div>
                    <span className="text-sm font-extrabold text-blue-400 font-mono">
                      {entry.avg?.toFixed(1)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
