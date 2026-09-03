import { resolveSpotifyCredentials } from "@/lib/spotify-credentials";
import Link from "next/link";
import { KeyRound, Settings, Users } from "lucide-react";

/**
 * Server component that renders a banner when the user has no Spotify
 * credentials configured (personal or via a group). Shown on gated pages.
 */
export async function SpotifyCredentialsBanner() {
  const { credentials, missingReason } = await resolveSpotifyCredentials();

  if (credentials) return null;

  return (
    <div className="bg-amber-950/60 border border-amber-700/50 rounded-2xl p-4 mb-6">
      <div className="flex items-start gap-3">
        <KeyRound className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-amber-200">{missingReason}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-700/50 hover:bg-amber-700/70 text-amber-100 text-xs font-semibold transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              Add credentials
            </Link>
            <Link
              href="/groups"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-night-700 hover:bg-night-600 text-zinc-200 text-xs font-semibold transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              Join a group
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}