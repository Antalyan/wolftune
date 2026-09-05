"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Users, RefreshCw, Radio } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { GroupRatingsResponse, GroupMemberRating } from "@/app/api/groups/[groupId]/ratings/route";

export interface GroupOption {
  id: string;
  name: string;
}

export interface PanelTrack {
  id: string;
  name: string;
}

interface GroupRatingsPanelProps {
  groups: GroupOption[];
  kind: "album" | "playlist";
  targetId: string;
  tracks: PanelTrack[];
  /** Disable the "Live" subscription but keep polling. */
  live?: boolean;
}

const POLL_MS = 15_000;

function fmt(score: number): string {
  return score.toFixed(1);
}

function memberAvg(m: GroupMemberRating): number | null {
  const scores = Object.values(m.trackScores);
  if (scores.length === 0) return null;
  const sum = scores.reduce((acc, s) => acc + s, 0);
  return sum / scores.length;
}

export function GroupRatingsPanel({
  groups,
  kind,
  targetId,
  tracks,
  live = true,
}: GroupRatingsPanelProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    groups[0]?.id ?? ""
  );
  const [data, setData] = useState<GroupRatingsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(live);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const activeGroupRef = useRef(selectedGroupId);

  const trackName = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tracks) map.set(t.id, t.name);
    return map;
  }, [tracks]);

  const fetchRatings = useCallback(
    async (groupId: string) => {
      if (!groupId) return;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          kind,
          target: targetId,
          tracks: tracks.map((t) => t.id).join(","),
        });
        const res = await fetch(`/api/groups/${groupId}/ratings?${params.toString()}`, {
          cache: "no-store",
        });
        const body = (await res.json().catch(() => null)) as
          | (GroupRatingsResponse & { error?: string })
          | null;
        if (!res.ok) {
          setError(body?.error ?? `Request failed with status ${res.status}.`);
          return;
        }
        if (body) {
          setData(body);
          setLastUpdated(new Date());
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unexpected error.");
      } finally {
        setLoading(false);
      }
    },
    [kind, targetId, tracks]
  );

  // Load whenever the selected group changes.
  useEffect(() => {
    activeGroupRef.current = selectedGroupId;
    void fetchRatings(selectedGroupId);
  }, [selectedGroupId, fetchRatings]);

  // Live updates via Supabase Realtime (when enabled) + a slower polling
  // fallback so changes show up even if Realtime isn't configured.
  useEffect(() => {
    if (!isLive || !selectedGroupId) return;

    const client = createClient();
    const channelName = `group-ratings-${selectedGroupId}-${targetId}`;
    const channel = client.channel(channelName);
    const onTrack = () => {
      void fetchRatings(activeGroupRef.current);
    };
    const sub = kind === "album"
      ? channel
          .on("postgres_changes", { event: "*", schema: "public", table: "track_ratings" }, onTrack)
          .on("postgres_changes", { event: "*", schema: "public", table: "album_ratings" }, onTrack)
      : channel
          .on("postgres_changes", { event: "*", schema: "public", table: "track_ratings" }, onTrack)
          .on("postgres_changes", { event: "*", schema: "public", table: "playlist_ratings" }, onTrack);
    sub.subscribe();

    const poll = setInterval(() => {
      void fetchRatings(activeGroupRef.current);
    }, POLL_MS);

    return () => {
      clearInterval(poll);
      void client.removeChannel(channel);
    };
  }, [isLive, selectedGroupId, kind, targetId, fetchRatings]);

  if (groups.length === 0) return null;

  const members = data?.members ?? [];
  const subjectiveScores = members
    .map((m) => m.subjectiveScore)
    .filter((s): s is number => s !== null);
  const groupSubjectiveAvg =
    subjectiveScores.length > 0
      ? subjectiveScores.reduce((a, b) => a + b, 0) / subjectiveScores.length
      : null;
  const ratedMembers = members.length;

  return (
    <div className="bg-night-800/60 border border-night-700 rounded-xl p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-300">
          <Users className="w-4 h-4 text-blue-400" /> Group ratings
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsLive((v) => !v)}
            className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Toggle live updates"
          >
            <Radio className={`w-3 h-3 ${isLive ? "text-emerald-400" : ""}`} />
            {isLive ? "Live" : "Paused"}
          </button>
          <button
            type="button"
            onClick={() => fetchRatings(selectedGroupId)}
            className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
            aria-label="Refresh"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <select
        value={selectedGroupId}
        onChange={(e) => setSelectedGroupId(e.target.value)}
        className="mb-3 w-full bg-night-900 border border-night-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
        aria-label="Select group"
      >
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>

      {groups.length === 1 && (
        <p className="mb-3 text-[10px] text-zinc-500">{data?.groupName}</p>
      )}

      {error && (
        <p className="text-xs text-red-300 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2 mb-3">
          {error}
        </p>
      )}

      {!loading && !error && members.length === 0 && (
        <p className="text-xs text-zinc-500">
          No one in this group has rated this {kind} yet. Rate it and their scores will appear
          here live.
        </p>
      )}

      {ratedMembers > 0 && (
        <div className="mb-3 flex items-center gap-2 flex-wrap text-xs">
          <span className="px-2 py-1 rounded-full bg-blue-600/20 text-blue-300">
            {ratedMembers} {ratedMembers === 1 ? "member" : "members"} rated
          </span>
          {groupSubjectiveAvg !== null && (
            <span className="px-2 py-1 rounded-full bg-emerald-600/20 text-emerald-300">
              group {kind} avg {fmt(groupSubjectiveAvg)}
            </span>
          )}
        </div>
      )}

      {members.length > 0 && (
        <ul className="space-y-3">
          {members.map((m) => {
            const avg = memberAvg(m);
            return (
              <li key={m.userId} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-night-700 overflow-hidden shrink-0">
                    {m.avatarUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.avatarUrl} alt={m.username} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <span className="text-sm text-white truncate font-medium">{m.username}</span>
                  {m.subjectiveScore !== null && (
                    <span className="ml-auto shrink-0 text-sm font-bold text-emerald-400 font-mono">
                      {fmt(m.subjectiveScore)}
                    </span>
                  )}
                </div>
                {m.note && <p className="text-[11px] text-zinc-400 pl-8">“{m.note}”</p>}
                {avg !== null && (
                  <div className="pl-8">
                    <p className="text-[10px] text-zinc-500 mb-0.5">Track avg {fmt(avg)}</p>
                    <div className="space-y-0.5">
                      {Object.entries(m.trackScores).map(([tid, score]) => (
                        <div
                          key={tid}
                          className="flex items-center justify-between gap-2 text-[11px]"
                        >
                          <span className="text-zinc-400 truncate">{trackName.get(tid) ?? "Track"}</span>
                          <span className="text-zinc-200 font-mono shrink-0">{fmt(score)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {lastUpdated && (
        <p className="mt-3 text-[10px] text-zinc-600">
          Updated {lastUpdated.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
