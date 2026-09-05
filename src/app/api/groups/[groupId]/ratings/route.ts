import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export const dynamic = "force-dynamic";

type Kind = "album" | "playlist";

/** One group member's ratings for an album/playlist. */
export interface GroupMemberRating {
  userId: string;
  username: string;
  avatarUrl: string | null;
  /** Subjective overall score for the target album/playlist, if any. */
  subjectiveScore: number | null;
  note: string | null;
  /** Per-track scores keyed by track spotify id. */
  trackScores: Record<string, number>;
}

export interface GroupRatingsResponse {
  groupId: string;
  groupName: string;
  members: GroupMemberRating[];
}

/**
 * Returns other members' ratings of an album/playlist within a group.
 * Only members of the group can read these (privacy gate). The requesting
 * user's own ratings are excluded — they're shown in the rating form itself.
 */
export async function GET(
  request: Request,
  { params }: { params: { groupId: string } }
) {
  const groupId = params.groupId;
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") as Kind | null;
  const target = url.searchParams.get("target") ?? "";
  const trackIds = (url.searchParams.get("tracks") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (kind !== "album" && kind !== "playlist") {
    return NextResponse.json(
      { error: "kind must be 'album' or 'playlist'." },
      { status: 400 }
    );
  }
  if (!target) {
    return NextResponse.json({ error: "target (spotify id) is required." }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  // Privacy gate: only members may read group ratings.
  const { data: membership } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: "Not a member of this group." }, { status: 403 });
  }

  const { data: group } = await supabase
    .from("groups")
    .select("name")
    .eq("id", groupId)
    .single();

  const { data: memberships } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId);
  const memberIds = (memberships ?? []).map((m) => m.user_id);
  // Exclude the requesting user (own ratings live in the rating form).
  const peerIds = memberIds.filter((uid) => uid !== user.id);
  if (peerIds.length === 0) {
    return NextResponse.json({
      groupId,
      groupName: group?.name ?? "Group",
      members: [],
    });
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .in("id", peerIds);
  const profileMap = new Map<string, Pick<Profile, "id" | "username" | "avatar_url">>(
    (profiles ?? []).map((p) => [p.id, p])
  );

  // Subjective overall scores for the target album/playlist.
  let subjectiveRows: { user_id: string; subjective_score: number; note: string | null }[] = [];
  if (kind === "album") {
    const { data } = await supabase
      .from("album_ratings")
      .select("user_id, subjective_score, note")
      .eq("album_spotify_id", target)
      .in("user_id", peerIds);
    subjectiveRows = (data ?? []) as typeof subjectiveRows;
  } else {
    const { data } = await supabase
      .from("playlist_ratings")
      .select("user_id, subjective_score, note")
      .eq("playlist_spotify_id", target)
      .in("user_id", peerIds);
    subjectiveRows = (data ?? []) as typeof subjectiveRows;
  }

  // Per-track scores, bounded to the target's tracks when provided.
  let trackRows: { user_id: string; track_spotify_id: string; score: number }[] = [];
  if (trackIds.length > 0) {
    const { data } = await supabase
      .from("track_ratings")
      .select("user_id, track_spotify_id, score")
      .in("track_spotify_id", trackIds)
      .in("user_id", peerIds);
    trackRows = (data ?? []) as typeof trackRows;
  }

  const members: GroupMemberRating[] = peerIds.map((uid) => {
    const prof = profileMap.get(uid);
    const subjective = subjectiveRows.find((r) => r.user_id === uid);
    const trackScores: Record<string, number> = {};
    for (const r of trackRows) {
      if (r.user_id === uid) trackScores[r.track_spotify_id] = Number(r.score);
    }
    return {
      userId: uid,
      username: prof?.username ?? "Unknown",
      avatarUrl: prof?.avatar_url ?? null,
      subjectiveScore: subjective ? Number(subjective.subjective_score) : null,
      note: subjective?.note ?? null,
      trackScores,
    };
  }).filter(
    (m) => m.subjectiveScore !== null || Object.keys(m.trackScores).length > 0
  );

  return NextResponse.json<GroupRatingsResponse>({
    groupId,
    groupName: group?.name ?? "Group",
    members,
  });
}
