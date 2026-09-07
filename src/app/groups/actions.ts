"use server";

import {revalidatePath} from "next/cache";
import {createClient} from "@/lib/supabase/server";
import {getAlbumWithTracks, getPlaylistWithTracks, SpotifyApiError} from "@/lib/spotify";
import {resolveSpotifyCredentials} from "@/lib/spotify-credentials";
import {upsertAlbumSnapshot, upsertPlaylistSnapshot} from "@/lib/catalog";
import {GroupRatingPlanInsert, GroupRatingPlanUpdate} from "@/types/database";

/** Generates a short, URL-safe invite code (8 chars, alphanumeric). */
function generateInviteCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

export interface GroupActionResult {
    error: string | null;
    /** Set on successful join so the UI can show a one-time confirmation. */
    success?: boolean;
}

/**
 * Creates a new group and auto-adds the creator as admin via the
 * `on_group_created` trigger in the migration.
 */
export async function createGroup(
    _prev: GroupActionResult,
    formData: FormData
): Promise<GroupActionResult> {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return {error: "Group name is required."};
    if (name.length > 40) return {error: "Group name must be 40 characters or less."};

    const supabase = createClient();
    const {
        data: {user},
    } = await supabase.auth.getUser();
    if (!user) return {error: "You must be signed in."};

    const {error} = await supabase.from("groups").insert({
        name,
        invite_code: generateInviteCode(),
        owner_id: user.id,
    });

    if (error) {
        return {
            error: error.message.includes("duplicate")
                ? "Invite code collision — please try again."
                : error.message,
        };
    }

    revalidatePath("/groups");
    return {error: null};
}

/** Adds the signed-in user to a group by its invite code. */
export async function joinGroup(
    _prev: GroupActionResult,
    formData: FormData
): Promise<GroupActionResult> {
    const inviteCode = String(formData.get("invite_code") ?? "")
        .trim()
        .toUpperCase();
    if (!inviteCode) return {error: "Invite code is required."};

    const supabase = createClient();
    const {
        data: {user},
    } = await supabase.auth.getUser();
    if (!user) return {error: "You must be signed in."};

    const {data: group, error: findErr} = await supabase
        .from("groups")
        .select("id")
        .eq("invite_code", inviteCode)
        .single();

    if (findErr || !group) return {error: "No group found with that invite code."};

    const {error} = await supabase.from("group_members").insert({
        group_id: group.id,
        user_id: user.id,
        role: "member",
    });

    if (error) {
        return {
            error: error.message.includes("duplicate")
                ? "You are already in this group."
                : error.message,
        };
    }

    revalidatePath("/groups");
    return {error: null, success: true};
}

export interface GroupSettingsActionResult {
    error: string | null;
    success: string | null;
}

/** Owner-only: updates the group's shared Spotify credentials. */
export async function updateGroupCredentials(
    groupId: string,
    _prev: GroupSettingsActionResult,
    formData: FormData
): Promise<GroupSettingsActionResult> {
    const clientId = String(formData.get("client_id") ?? "").trim();
    const clientSecret = String(formData.get("client_secret") ?? "").trim();

    const supabase = createClient();
    const {
        data: {user},
    } = await supabase.auth.getUser();
    if (!user) return {error: "You must be signed in.", success: null};

    // Owner-only check
    const {data: group, error: fetchErr} = await supabase
        .from("groups")
        .select("owner_id")
        .eq("id", groupId)
        .single();

    if (fetchErr || !group) return {error: "Group not found.", success: null};
    if (group.owner_id !== user.id)
        return {error: "Only the group owner can manage credentials.", success: null};

    if (!clientId || !clientSecret)
        return {error: "Both Client ID and Client Secret are required.", success: null};

    const {error} = await supabase
        .from("groups")
        .update({
            spotify_client_id: clientId,
            spotify_client_secret: clientSecret,
        })
        .eq("id", groupId);

    if (error) return {error: error.message, success: null};

    revalidatePath(`/groups/${groupId}`);
    return {error: null, success: "Group Spotify credentials saved."};
}

// ------------------------------------------------------------
// Group rating plans — collaborative scheduling
// ------------------------------------------------------------

export interface PlanActionResult {
    error: string | null;
    success: string | null;
}

function isoDate(value: string): string | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (!m) return null;
    const [, ys, ms, ds] = m;
    const mo = Number(ms);
    const d = Number(ds);
    const y = Number(ys);
    if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return null;
        return `${ys}-${ms}-${ds}`;
}

/** Extracts a bare Spotify ID from a URL, URI, or bare ID. */
function extractSpotifyId(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return "";
    // Spotify URI: spotify:track:123  or  playlist, album
    const uriMatch = /^spotify:(?:album|artist|playlist|track):([A-Za-z0-9]+)$/i.exec(trimmed);
    if (uriMatch) return uriMatch[1];
    // Spotify URL: https://open.spotify.com/album/123
    const urlMatch = /^https?:\/\/open\.spotify\.com\/(?:album|playlist|track)\/([A-Za-z0-9]+)/i.exec(trimmed);
    if (urlMatch) return urlMatch[1];
    // Bare ID (22-char base62)
    if (/^[A-Za-z0-9]{22}$/.test(trimmed)) return trimmed;
    // Fallback: take the last path segment or URI segment
    const lastSegment = trimmed.split("/").pop()?.split(":").pop() ?? "";
    return /^[A-Za-z0-9]+$/.test(lastSegment) ? lastSegment : "";
}

async function requireMembership(
    supabase: ReturnType<typeof createClient>,
    groupId: string
): Promise<string | null> {
    const {
        data: {user},
    } = await supabase.auth.getUser();
    if (!user) return "You must be signed in.";
    const {data: membership} = await supabase
        .from("group_members")
        .select("group_id")
        .eq("group_id", groupId)
        .eq("user_id", user.id)
        .maybeSingle();
    if (!membership) return "You're not a member of this group.";
    return null;
}

/**
 * Ensures a plan target (album/playlist) exists in the local catalog before a
 * plan references it (FK on group_rating_plans → music_albums/playlists).
 * If not already cached, fetches it from Spotify and writes the snapshot.

 * Returns an error message to surface, or null on success.
 */
async function ensurePlanTargetCached(
    supabase: ReturnType<typeof createClient>,
    target: { kind: "album"; id: string } | { kind: "playlist"; id: string }
): Promise<string | null> {
    const table = target.kind === "album" ? "music_albums" : "music_playlists";
    const { error, data: existing } = await supabase
        .from(table)
        .select("spotify_id")
        .eq("spotify_id", target.id)
        .maybeSingle();
    if (error) return `Could not verify the ${target.kind} in the catalog: ${error.message}`;
    if (existing) return null;

    const { credentials, missingReason } = await resolveSpotifyCredentials();
    if (!credentials) return missingReason ?? "Spotify credentials are required to cache this target.";

    try {
        if (target.kind === "album") {
            const { album, tracks } = await getAlbumWithTracks(target.id, credentials);
            await upsertAlbumSnapshot(album, tracks);
        } else {
            const { playlist, tracks } = await getPlaylistWithTracks(target.id, credentials);
            await upsertPlaylistSnapshot(playlist, tracks);
        }
    } catch (err) {
        if (err instanceof SpotifyApiError && err.status === 404) {
            return `That ${target.kind} does not exist on Spotify.`;
        }
        return err instanceof Error ? err.message : `Could not load the ${target.kind} from Spotify.`;
    }
    return null;
}

/** Adds a rating-plan entry to a group (any member may do this). */
export async function addPlanEntry(
    _prev: PlanActionResult,
    formData: FormData
): Promise<PlanActionResult> {
    const groupId = String(formData.get("group_id") ?? "");
    const scheduledDate = isoDate(String(formData.get("scheduled_date") ?? ""));
    const assignedMemberId = String(formData.get("assigned_member_id") ?? "");
    const albumId = extractSpotifyId(String(formData.get("album_spotify_id") ?? ""));
    const playlistId = extractSpotifyId(String(formData.get("playlist_spotify_id") ?? ""));

    if (!groupId) return {error: "Missing group.", success: null};
    if (!scheduledDate) return {error: "A valid scheduled date is required.", success: null};
    if (!assignedMemberId) return {error: "Choose a member to assign this to.", success: null};
    const hasAlbum = albumId.length > 0;
    const hasPlaylist = playlistId.length > 0;
    if (hasAlbum === hasPlaylist) {
        return {error: "Assign exactly one album or one playlist.", success: null};
    }

    const supabase = createClient();
    const denied = await requireMembership(supabase, groupId);
    if (denied) return {error: denied, success: null};

    const {data: assignedMembership} = await supabase
        .from("group_members")
        .select("group_id")
        .eq("group_id", groupId)
        .eq("user_id", assignedMemberId)
        .maybeSingle();
    if (!assignedMembership) {
        return {error: "The assigned member is not in this group.", success: null};
    }

    // Ensure the target album/playlist is cached locally, else the FK insert fails.


    const targetError = hasAlbum
        ? await ensurePlanTargetCached(supabase, { kind: "album", id: albumId })
        : await ensurePlanTargetCached(supabase, { kind: "playlist", id: playlistId });
    if (targetError) return {error: targetError, success: null};

    const insert: GroupRatingPlanInsert = {
        group_id: groupId,
        assigned_member_id: assignedMemberId,
        scheduled_date: scheduledDate,
        album_spotify_id: hasAlbum ? albumId : null,
        playlist_spotify_id: hasPlaylist ? playlistId : null,
    };

    const {error} = await supabase.from("group_rating_plans").insert(insert);
    if (error) return {error: error.message, success: null};

    revalidatePath(`/groups/${groupId}`);
    return {error: null, success: "Plan entry added."};
}

/** Updates an existing plan entry (date / assigned member / target). */
export async function updatePlanEntry(
    _prev: PlanActionResult,
    formData: FormData
): Promise<PlanActionResult> {
    const planId = String(formData.get("plan_id") ?? "");
    const groupId = String(formData.get("group_id") ?? "");
    const scheduledDate = isoDate(String(formData.get("scheduled_date") ?? ""));
    const assignedMemberId = String(formData.get("assigned_member_id") ?? "");
    const albumId = extractSpotifyId(String(formData.get("album_spotify_id") ?? ""));
    const playlistId = extractSpotifyId(String(formData.get("playlist_spotify_id") ?? ""));

    if (!planId || !groupId) return {error: "Missing plan.", success: null};
    if (!scheduledDate) return {error: "A valid scheduled date is required.", success: null};
    if (!assignedMemberId) return {error: "Choose a member to assign this to.", success: null};
    const hasAlbum = albumId.length > 0;
    const hasPlaylist = playlistId.length > 0;
    if (hasAlbum === hasPlaylist) {
        return {error: "Assign exactly one album or one playlist.", success: null};
    }

    const supabase = createClient();
    const denied = await requireMembership(supabase, groupId);
    if (denied) return {error: denied, success: null};

    const {data: assignedMembership} = await supabase
        .from("group_members")
        .select("group_id")
        .eq("group_id", groupId)
        .eq("user_id", assignedMemberId)
        .maybeSingle();
    if (!assignedMembership) {
        return {error: "The assigned member is not in this group.", success: null};
    }

    // Ensure the target album/playlist is cached locally, else the FK update fails.


    const targetError = hasAlbum
        ? await ensurePlanTargetCached(supabase, { kind: "album", id: albumId })
        : await ensurePlanTargetCached(supabase, { kind: "playlist", id: playlistId });
    if (targetError) return {error: targetError, success: null};

    const update: GroupRatingPlanUpdate = {
        assigned_member_id: assignedMemberId,
        scheduled_date: scheduledDate,
        album_spotify_id: hasAlbum ? albumId : null,
        playlist_spotify_id: hasPlaylist ? playlistId : null,
    };

    const {error} = await supabase.from("group_rating_plans").update(update).eq("id", planId);
    if (error) return {error: error.message, success: null};

    revalidatePath(`/groups/${groupId}`);
    return {error: null, success: "Plan entry updated."};
}

/** Deletes a plan entry. */
export async function deletePlanEntry(
    _prev: PlanActionResult,
    formData: FormData
): Promise<PlanActionResult> {
    const planId = String(formData.get("plan_id") ?? "");
    const groupId = String(formData.get("group_id") ?? "");
    if (!planId || !groupId) return {error: "Missing plan.", success: null};

    const supabase = createClient();
    const denied = await requireMembership(supabase, groupId);
    if (denied) return {error: denied, success: null};

    const {error} = await supabase.from("group_rating_plans").delete().eq("id", planId);
    if (error) return {error: error.message, success: null};

    revalidatePath(`/groups/${groupId}`);
    return {error: null, success: "Plan entry removed."};
}

/** Removes the signed-in user from a group. */
export async function leaveGroup(
    _prev: GroupActionResult,
    formData: FormData
): Promise<GroupActionResult> {
    const groupId = String(formData.get("group_id") ?? "");
    if (!groupId) return {error: "Missing group id."};

    const supabase = createClient();
    const {
        data: {user},
    } = await supabase.auth.getUser();
    if (!user) return {error: "You must be signed in."};

    const {error} = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", user.id);

    if (error) return {error: error.message};

    revalidatePath("/groups");
    revalidatePath(`/groups/${groupId}`);
    return {error: null};
}
