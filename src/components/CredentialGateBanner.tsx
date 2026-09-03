import Link from "next/link";
import { KeyRound, Settings, Users } from "lucide-react";

interface CredentialGateBannerProps {
  message: string;
}

/**
 * Shown on gated pages (Search, Game, Rate, Reviews) when the user has no
 * Spotify credentials available — neither personal, nor via a group.
 */
export function CredentialGateBanner({ message }: CredentialGateBannerProps) {
  return (
    <div className="max-w-5xl mx-auto px-4 pt-6 w-full">
      <div className="bg-amber-950/40 border border-amber-700/40 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="p-3 rounded-xl bg-amber-900/30 border border-amber-700/30 text-amber-400 shrink-0">
          <KeyRound className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-amber-200 mb-1">Spotify credentials required</h2>
          <p className="text-sm text-amber-300/80 leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-spotify-green hover:bg-spotify-bright text-night-950 text-xs font-bold transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            Add credentials
          </Link>
          <Link
            href="/groups"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-amber-600/40 hover:border-amber-500/60 text-amber-200 text-xs font-bold transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            Groups
          </Link>
        </div>
      </div>
    </div>
  );
}
