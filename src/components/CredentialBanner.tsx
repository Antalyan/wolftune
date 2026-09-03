import Link from "next/link";
import { KeyRound, Settings, Users } from "lucide-react";

interface CredentialBannerProps {
  /** User-facing message from the credential resolver. */
  message: string | null;
}

/**
 * Shown on gated pages (search, rate, game, reviews) when the current user
 * has no Spotify credentials and isn't in a group that has them.
 */
export function CredentialBanner({ message }: CredentialBannerProps) {
  if (!message) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 pt-6 w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-amber-950/30 border border-amber-700/40 rounded-2xl p-4">
        <div className="p-2 rounded-xl bg-amber-900/40 text-amber-400 shrink-0">
          <KeyRound className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-amber-200 text-sm">Spotify credentials required</h3>
          <p className="text-xs text-amber-300/80 mt-0.5 leading-relaxed">{message}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/settings"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600/20 border border-amber-600/40 text-amber-200 text-xs font-semibold hover:bg-amber-600/30 transition-colors"
          >
            <Settings className="w-3 h-3" />
            Add yours
          </Link>
          <Link
            href="/groups"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-night-800 border border-night-600 text-zinc-300 text-xs font-semibold hover:border-amber-600/40 hover:text-amber-200 transition-colors"
          >
            <Users className="w-3 h-3" />
            Join a group
          </Link>
        </div>
      </div>
    </div>
  );
}
