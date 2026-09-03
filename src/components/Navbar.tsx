import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import type { LucideIcon } from "lucide-react";
import { Headphones, Settings, Star, Trophy, Search, Users } from "lucide-react";
import { WolfMascot } from "./WolfMascot";
import { AuthButton } from "./AuthButton";
import { MobileMenu } from "./MobileMenu";
import { createClient } from "@/lib/supabase/server";
import { navLinks, type NavLinkIcon } from "./nav-links";

/** Server-side mapping from serializable icon keys to Lucide components. */
const NAV_ICONS: Record<NavLinkIcon, LucideIcon> = {
  search: Search,
  headphones: Headphones,
  star: Star,
  trophy: Trophy,
  users: Users,
};

export async function Navbar() {
  // If Supabase env isn't configured yet, degrade gracefully to signed-out UI
  // instead of crashing the whole layout.
  let user: User | null = null;
  try {
    const supabase = createClient();
    const {
      data: { user: sessionUser },
    } = await supabase.auth.getUser();
    user = sessionUser;
  } catch {
    // env vars missing — treat as signed out
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-blue-900/40 bg-night/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="p-1 rounded-xl bg-gradient-to-br from-blue-600/20 to-emerald-500/20 group-hover:from-blue-600/30 group-hover:to-emerald-500/30 transition-all border border-blue-500/30">
            <WolfMascot size={34} mood="listening" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight text-white">
              Wolf<span className="text-blue-500">Tune</span>
            </span>
            <span className="text-[10px] text-zinc-400 font-medium tracking-wider uppercase -mt-1">
              Rate & Guess
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav aria-label="Main navigation" className="hidden md:flex items-center gap-1">
          {navLinks
            .filter((link) => !link.authOnly || user)
            .map(({ href, label, icon, color }) => {
              const Icon = NAV_ICONS[icon];
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-zinc-300 hover:text-white hover:bg-night-700/60 transition-colors"
                >
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span>{label}</span>
                </Link>
              );
            })}
          {user && (
            <Link
              href="/settings"
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-zinc-300 hover:text-white hover:bg-night-700/60 transition-colors"
            >
              <Settings className="w-4 h-4 text-blue-400" />
              <span>Settings</span>
            </Link>
          )}
        </nav>

        {/* Right side: auth + CTA + mobile toggle */}
        <div className="flex items-center gap-3">
          <AuthButton user={user} />
          <Link
            href="/game"
            className="hidden sm:inline-flex items-center justify-center text-sm font-semibold px-4 py-2 rounded-lg bg-spotify-green hover:bg-spotify-bright text-night-950 shadow-lg shadow-emerald-500/20 transition-all"
          >
            Play Now
          </Link>
          <MobileMenu links={navLinks} user={user} />
        </div>
      </div>
    </header>
  );
}