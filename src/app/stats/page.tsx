import Link from "next/link";
import type { ReactNode } from "react";
import { BarChart3, Music2, Disc3, ListMusic, Users, HeartHandshake } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserGroups } from "@/lib/groups";
import {
  getGroupBestTracks,
  getGroupBestAlbums,
  getGroupBestPlaylists,
  getMemberSimilarities,
  type GroupBestTrack,
  type GroupBestAlbum,
  type GroupBestPlaylist,
  type MemberSimilarity,
} from "@/lib/stats";
import { WolfMascot } from "@/components/WolfMascot";
import { GroupLeaderboardSwitcher } from "@/app/leaderboard/group-switcher";

export const dynamic = "force-dynamic";

interface StatsPageProps {
  searchParams?: { group?: string };
}

export default async function StatsPage({ searchParams }: StatsPageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <WolfMascot size={80} mood="listening" />
        <h2 className="mt-6 text-2xl font-bold text-white">Sign in to see group statistics</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Statistics are computed from your group&apos;s ratings.
        </p>
      </div>
    );
  }

  const groups = await getUserGroups(supabase, user.id);
  const requested = searchParams?.group;
  const selectedGroupId =
    groups.find((g) => g.id === requested)?.id ?? groups[0]?.id ?? null;
  const selectedGroupName = groups.find((g) => g.id === selectedGroupId)?.name ?? null;

  let bestTracks: GroupBestTrack[] = [];
  let bestAlbums: GroupBestAlbum[] = [];
  let bestPlaylists: GroupBestPlaylist[] = [];
  let similarities: MemberSimilarity[] = [];
  if (selectedGroupId) {
    [bestTracks, bestAlbums, bestPlaylists, similarities] = await Promise.all([
      getGroupBestTracks(supabase, selectedGroupId),
      getGroupBestAlbums(supabase, selectedGroupId),
      getGroupBestPlaylists(supabase, selectedGroupId),
      getMemberSimilarities(supabase, selectedGroupId),
    ]);
  }

  const hasData =
    bestTracks.length + bestAlbums.length + bestPlaylists.length + similarities.length > 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-400" /> Group Statistics
        </h1>
        <p className="text-xs text-zinc-400">
          Best music and taste similarity across your group&apos;s ratings.
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
          <GroupLeaderboardSwitcher groups={groups} selectedId={selectedGroupId} basePath="/stats" />
          {selectedGroupName && (
            <p className="text-xs text-zinc-500 mb-4">
              Showing statistics for <span className="text-zinc-300 font-semibold">{selectedGroupName}</span>.
            </p>
          )}

          {!hasData ? (
            <div className="text-center py-12">
              <WolfMascot size={70} mood="cool" />
              <p className="mt-4 text-sm text-zinc-400">
                No ratings in this group yet — rate some albums or playlists first.
              </p>
              <Link
                href="/rate"
                className="mt-4 inline-block px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
              >
                Rate something
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              <BestSection
                title="Best songs"
                icon={<Music2 className="w-4 h-4 text-spotify-green" />}
                emptyHint="No song ratings yet."
                items={bestTracks.map((t) => ({
                  id: t.trackId,
                  title: t.name,
                  subtitle: [t.artistName, t.albumName].filter(Boolean).join(" · "),
                  avg: t.avg,
                  count: t.ratingsCount,
                  href: t.albumId ? `/albums/${t.albumId}` : undefined,
                }))}
              />

              <BestSection
                title="Best albums"
                icon={<Disc3 className="w-4 h-4 text-blue-400" />}
                emptyHint="No album ratings yet."
                items={bestAlbums.map((a) => ({
                  id: a.albumId,
                  title: a.name,
                  subtitle: a.artistName,
                  avg: a.avg,
                  count: a.ratingsCount,
                  href: `/albums/${a.albumId}`,
                }))}
              />

              <BestSection
                title="Best playlists"
                icon={<ListMusic className="w-4 h-4 text-emerald-400" />}
                emptyHint="No playlist ratings yet."
                items={bestPlaylists.map((p) => ({
                  id: p.playlistId,
                  title: p.name,
                  subtitle: p.ownerName ? `by ${p.ownerName}` : "",
                  avg: p.avg,
                  count: p.ratingsCount,
                  href: `/playlists/${p.playlistId}`,
                }))}
              />

              <SimilaritySection similarities={similarities} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface BestItem {
  id: string;
  title: string;
  subtitle: string;
  avg: number;
  count: number;
  href?: string;
}

function BestSection({
  title,
  icon,
  items,
  emptyHint,
}: {
  title: string;
  icon: ReactNode;
  items: BestItem[];
  emptyHint: string;
}) {
  return (
    <section>
      <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-300 mb-3">
        {icon}
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="text-xs text-zinc-500">{emptyHint}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <StatsRow key={item.id} rank={idx + 1} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

function StatsRow({ rank, item }: { rank: number; item: BestItem }) {
  const widthPct = Math.max(4, Math.min(100, (item.avg / 10) * 100));
  const content = (
    <div className="p-3 rounded-xl bg-night-800/80 border border-night-700 hover:border-night-600 transition-colors">
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <span className="flex items-center gap-2 min-w-0">
          <span
            className={`text-xs font-bold w-5 text-center shrink-0 ${
              rank === 1 ? "text-yellow-400" : rank <= 3 ? "text-amber-300" : "text-zinc-500"
            }`}
          >
            {rank}
          </span>
          <span className="text-sm text-white truncate">{item.title}</span>
        </span>
        <span className="text-sm font-bold text-spotify-green shrink-0">{item.avg.toFixed(1)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-night-900 overflow-hidden mb-1.5">
        <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-spotify-green" style={{ width: `${widthPct}%` }} />
      </div>
      <div className="flex items-center justify-between gap-2 text-[10px] text-zinc-500">
        <span className="truncate">{item.subtitle}</span>
        <span className="shrink-0">
          {item.count} rating{item.count === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
  return item.href ? (
    <Link href={item.href} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}

function SimilaritySection({ similarities }: { similarities: MemberSimilarity[] }) {
  const computable = similarities.filter((s) => s.correlation !== null);
  const pending = similarities.filter((s) => s.correlation === null);

  const label = (c: number): string => {
    if (c >= 0.8) return "Taste twins";
    if (c >= 0.5) return "Very similar";
    if (c >= 0.2) return "Similar";
    if (c > -0.2) return "Mixed";
    return "Opposites";
  };
  const color = (c: number): string => {
    if (c >= 0.5) return "text-emerald-300";
    if (c >= 0.2) return "text-blue-300";
    if (c > -0.2) return "text-zinc-400";
    return "text-red-300";
  };

  return (
    <section>
      <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-300 mb-3">
        <HeartHandshake className="w-4 h-4 text-pink-400" />
        Similar preferences
      </h2>
      {similarities.length === 0 ? (
        <p className="text-xs text-zinc-500">Not enough members to compare.</p>
      ) : (
        <div className="space-y-2">
          {computable.map((s) => (
            <div
              key={`${s.userAId}-${s.userBId}`}
              className="flex items-center justify-between gap-3 p-3 rounded-xl bg-night-800/80 border border-night-700"
            >
              <div className="min-w-0">
                <div className="text-sm text-white truncate">
                  {s.usernameA} <span className="text-zinc-500">&</span> {s.usernameB}
                </div>
                <div className="text-[10px] text-zinc-500">
                  {s.sharedTracks} shared rated track{s.sharedTracks === 1 ? "" : "s"}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className={`text-sm font-bold ${color(s.correlation ?? 0)}`}>
                  {label(s.correlation ?? 0)}
                </div>
                <div className="text-[10px] text-zinc-500">
                  r = {(s.correlation ?? 0).toFixed(2)}
                </div>
              </div>
            </div>
          ))}
          {pending.map((s) => (
            <div
              key={`${s.userAId}-${s.userBId}`}
              className="flex items-center justify-between gap-3 p-3 rounded-xl bg-night-800/40 border border-night-800"
            >
              <div className="text-sm text-zinc-400 truncate">
                {s.usernameA} <span className="text-zinc-600">&</span> {s.usernameB}
              </div>
              <div className="text-[10px] text-zinc-600 shrink-0 flex items-center gap-1">
                <Users className="w-3 h-3" /> need {Math.max(0, 2 - s.sharedTracks)} more shared
                rating{s.sharedTracks === 1 ? "" : "s"}
              </div>
            </div>
          ))}
          <p className="text-[10px] text-zinc-600">
            Similarity is the correlation of track scores over the songs both members rated.
          </p>
        </div>
      )}
    </section>
  );
}
