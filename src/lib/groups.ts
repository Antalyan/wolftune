import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Profile } from "@/types/database";

export interface UserGroupSummary {
  id: string;
  name: string;
}

/** Groups the given user belongs to (owned or joined). */
export async function getUserGroups(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<UserGroupSummary[]> {
  const { data } = await supabase
    .from("group_members")
    .select("group_id, groups (id, name)")
    .eq("user_id", userId);

  return (data ?? [])
    .map((m) => {
      const g = Array.isArray(m.groups) ? m.groups[0] : m.groups;
      return g ? { id: g.id, name: g.name } : null;
    })
    .filter((g): g is UserGroupSummary => g !== null);
}

export interface GroupLeaderboardEntry {
  userId: string;
  username: string;
  avatarUrl: string | null;
  /** Average score across all the user's track ratings. */
  avg: number | null;
  /** Number of tracks rated. */
  ratingsCount: number;
}

/**
 * Ranks a group's members by their average track rating. Ratings are not
 * scoped to a single group (a track has one rating per user), so this reflects
 * each member's overall rating activity.
 */
export async function getGroupLeaderboard(
  supabase: SupabaseClient<Database>,
  groupId: string
): Promise<GroupLeaderboardEntry[]> {
  const { data: memberships } = await supabase
    .from("group_members")
    .select("user_id, profiles (id, username, avatar_url)")
    .eq("group_id", groupId);

  const memberIds = (memberships ?? []).map((m) => m.user_id);
  if (memberIds.length === 0) return [];

  const profiles = new Map<string, Pick<Profile, "id" | "username" | "avatar_url">>();
  for (const m of memberships ?? []) {
    const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    if (p) profiles.set(p.id, p);
  }

  const { data: ratings } = await supabase
    .from("track_ratings")
    .select("user_id, score")
    .in("user_id", memberIds);

  const sums = new Map<string, { total: number; count: number }>();
  for (const r of ratings ?? []) {
    const entry = sums.get(r.user_id) ?? { total: 0, count: 0 };
    entry.total += Number(r.score);
    entry.count += 1;
    sums.set(r.user_id, entry);
  }

  return memberIds
    .map((uid) => {
      const prof = profiles.get(uid);
      const sum = sums.get(uid);
      return {
        userId: uid,
        username: prof?.username ?? "Unknown",
        avatarUrl: prof?.avatar_url ?? null,
        avg: sum && sum.count > 0 ? Math.round((sum.total / sum.count) * 10) / 10 : null,
        ratingsCount: sum?.count ?? 0,
      };
    })
    .filter((e) => e.avg !== null)
    .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));
}
