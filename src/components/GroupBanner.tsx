import Link from "next/link";
import { Settings, Users } from "lucide-react";

interface GroupBannerProps {
  /** The page where the banner is shown (for the CTA link label). */
  page?: string;
}

/**
 * Banner shown on pages that need Spotify credentials when the user has none.
 * Shown on Search, Rate, Game, Reviews until the user adds credentials or
 * joins a group that has them.
 */
export function GroupBanner({ page = "this feature" }: GroupBannerProps) {
  return (
    <div className="max-w-5xl mx-auto px-4 w-full mb-6">
      <div className="bg-blue-950/60 border border-blue-700/40 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-full bg-blue-900/80 flex items-center justify-center shrink-0 mt-0.5">
            <Settings className="w-4 h-4 text-blue-300" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-blue-100">
              Spotify credentials needed for {page}
            </p>
            <p className="text-xs text-blue-300 mt-0.5">
              Add your own Spotify Developer Client ID in{" "}
              <Link href="/settings" className="underline hover:text-blue-100">
                Settings
              </Link>{" "}
              or join a group that already has one.
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link
            href="/settings"
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors"
          >
            <Settings className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
            Settings
          </Link>
          <Link
            href="/groups"
            className="px-3 py-1.5 rounded-lg border border-blue-600/40 hover:border-blue-500 text-blue-200 text-xs font-bold transition-colors"
          >
            <Users className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
            Groups
          </Link>
        </div>
      </div>
    </div>
  );
}
