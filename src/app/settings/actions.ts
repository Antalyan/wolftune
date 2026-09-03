"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface SettingActionResult {
  error: string | null;
  success: string | null;
}

/** Validates that a string looks like a Spotify client secret (basic check). */
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
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return { error: "You must be signed in.", success: null };

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
    .eq("id", session.user.id);

  if (error) return { error: error.message, success: null };

  revalidatePath("/settings");
  return {
    error: null,
    success: clear
      ? "Spotify credentials removed."
      : "Spotify credentials saved.",
  };
}
