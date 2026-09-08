"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface SettingActionResult {
  error: string | null;
  success: string | null;
}

/** Removes the user's stored Spotify refresh token (disconnect flow). */
export async function disconnectSpotify(): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("spotify_tokens").delete().eq("user_id", user.id);
  revalidatePath("/settings");
}

function isValidSecret(value: string): boolean {
  return value.trim().length >= 16;
}

/** Updates (or clears) the user's personal Spotify credentials. */
export async function updateSpotifyCredentials(
  _prev: SettingActionResult,
  formData: FormData
): Promise<SettingActionResult> {
  const clientId = String(formData.get("client_id") ?? "").trim();
  const clientSecret = String(formData.get("client_secret") ?? "").trim();
  const clear = formData.get("clear") === "1";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You must be signed in.", success: null };

  // Basic validation
  if (!clear) {
    if (!clientId || !clientSecret) {
      return { error: "Both Client ID and Client Secret are required.", success: null };
    }
    if (!isValidSecret(clientSecret)) {
      return { error: "Client Secret looks invalid.", success: null };
    }
  }

  const updates: { spotify_client_id: string | null; spotify_client_secret: string | null } = {
    spotify_client_id: clear ? null : clientId,
    spotify_client_secret: clear ? null : clientSecret,
  };

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) return { error: error.message, success: null };

  revalidatePath("/settings");
  return {
    error: null,
    success: clear
      ? "Spotify credentials removed."
      : "Spotify credentials saved.",
  };
}

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{2,24}$/;

/** Updates the user's display nickname (username). */
export async function updateUsername(
  _prev: SettingActionResult,
  formData: FormData
): Promise<SettingActionResult> {
  const username = String(formData.get("username") ?? "").trim();

  if (!USERNAME_PATTERN.test(username)) {
    return {
      error: "Username must be 2–24 characters (letters, numbers, underscores).",
      success: null,
    };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in.", success: null };

  const { error } = await supabase
    .from("profiles")
    .update({ username })
    .eq("id", user.id);

  if (error) return { error: error.message, success: null };

  revalidatePath("/settings");
  return { error: null, success: "Nickname updated." };
}
