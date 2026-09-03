"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
  if (!name) return { error: "Group name is required." };
  if (name.length > 40) return { error: "Group name must be 40 characters or less." };

  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { error: "You must be signed in." };

  const { error } = await supabase.from("groups").insert({
    name,
    invite_code: generateInviteCode(),
    owner_id: session.user.id,
  });

  if (error) {
    return {
      error: error.message.includes("duplicate")
        ? "Invite code collision — please try again."
        : error.message,
    };
  }

  revalidatePath("/groups");
  return { error: null };
}

/** Adds the signed-in user to a group by its invite code. */
export async function joinGroup(
  _prev: GroupActionResult,
  formData: FormData
): Promise<GroupActionResult> {
  const inviteCode = String(formData.get("invite_code") ?? "")
    .trim()
    .toUpperCase();
  if (!inviteCode) return { error: "Invite code is required." };

  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { error: "You must be signed in." };

  const { data: group, error: findErr } = await supabase
    .from("groups")
    .select("id")
    .eq("invite_code", inviteCode)
    .single();

  if (findErr || !group) return { error: "No group found with that invite code." };

  const { error } = await supabase.from("group_members").insert({
    group_id: group.id,
    user_id: session.user.id,
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
  return { error: null, success: true };
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
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { error: "You must be signed in.", success: null };

  // Owner-only check
  const { data: group, error: fetchErr } = await supabase
    .from("groups")
    .select("owner_id")
    .eq("id", groupId)
    .single();

  if (fetchErr || !group) return { error: "Group not found.", success: null };
  if (group.owner_id !== session.user.id)
    return { error: "Only the group owner can manage credentials.", success: null };

  if (!clientId || !clientSecret)
    return { error: "Both Client ID and Client Secret are required.", success: null };

  const { error } = await supabase
    .from("groups")
    .update({
      spotify_client_id: clientId,
      spotify_client_secret: clientSecret,
    })
    .eq("id", groupId);

  if (error) return { error: error.message, success: null };

  revalidatePath(`/groups/${groupId}`);
  return { error: null, success: "Group Spotify credentials saved." };
}

/** Removes the signed-in user from a group. */
export async function leaveGroup(
  _prev: GroupActionResult,
  formData: FormData
): Promise<GroupActionResult> {
  const groupId = String(formData.get("group_id") ?? "");
  if (!groupId) return { error: "Missing group id." };

  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { error: "You must be signed in." };

  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", session.user.id);

  if (error) return { error: error.message };

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  return { error: null };
}
