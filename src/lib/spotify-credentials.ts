import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface SpotifyCredentials {
  clientId: string;
  clientSecret: string;
  /** Where the credentials came from — useful for UI badges. */
  source: "user" | "group" | "env";
  /** Group name if source === "group". */
  groupName?: string;
}

export interface CredentialResolution {
  credentials: SpotifyCredentials | null;
  /** Machine-readable reason code. */
  reason: string | null;
  /** User-facing message when no credentials are available. */
  missingReason: string | null;
}

/**
 * Resolves Spotify API credentials for the current user using this priority:
 *   1. Personal credentials on the user's profile
 *   2. Credentials on any group the user belongs to (first found)
 *   3. Server environment variables (backward compat / admin fallback)
 */
export async function resolveSpotifyCredentials(): Promise<CredentialResolution> {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return {
      credentials: null,
      reason: "not_authenticated",
      missingReason: "You must be signed in to search and play music.",
    };
  }

  const userId = session.user.id;

  // 1. Personal credentials
  const { data: profile } = await supabase
    .from("profiles")
    .select("spotify_client_id, spotify_client_secret")
    .eq("id", userId)
    .single();

  if (profile?.spotify_client_id && profile?.spotify_client_secret) {
    return {
      credentials: {
        clientId: profile.spotify_client_id,
        clientSecret: profile.spotify_client_secret,
        source: "user",
      },
      reason: null,
      missingReason: null,
    };
  }

  // 2. Group credentials (first group that has them)
  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id, groups (id, name, spotify_client_id, spotify_client_secret)")
    .eq("user_id", userId);

  if (memberships) {
    for (const m of memberships) {
      const group = Array.isArray(m.groups) ? m.groups[0] : m.groups;
      if (group?.spotify_client_id && group?.spotify_client_secret) {
        return {
          credentials: {
            clientId: group.spotify_client_id,
            clientSecret: group.spotify_client_secret,
            source: "group",
            groupName: group.name,
          },
          reason: null,
          missingReason: null,
        };
      }
    }
  }

  // 3. Environment fallback
  const envId = process.env.SPOTIFY_CLIENT_ID;
  const envSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (envId && envSecret) {
    return {
      credentials: { clientId: envId, clientSecret: envSecret, source: "env" },
      reason: null,
      missingReason: null,
    };
  }

  // Nothing found
  const inAnyGroup = Boolean(memberships && memberships.length > 0);
  const missingReason = inAnyGroup
    ? "Your groups don't have Spotify credentials yet. Ask a group admin to add them, or add your own in Settings."
    : "To search and play music, add your Spotify Developer credentials in Settings or join a group that has them.";

  return { credentials: null, reason: "no_credentials", missingReason };
}

/**
 * Lightweight check used by gated pages and components — avoids running a
 * search just to discover there are no credentials.
 */
export async function hasSpotifyCredentials(): Promise<boolean> {
  const { credentials } = await resolveSpotifyCredentials();
  return credentials !== null;
}
