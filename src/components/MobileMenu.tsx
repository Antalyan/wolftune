"use client";

import { useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import type { LucideIcon } from "lucide-react";
import { Menu, X, LogIn, LogOut, Search, Headphones, Star, Trophy } from "lucide-react";
import { WolfMascot } from "./WolfMascot";
import type { NavLink, NavLinkIcon } from "./nav-links";

/** Client-side mapping from serializable icon keys to Lucide components. */
const NAV_ICONS: Record<NavLinkIcon, LucideIcon> = {
  search: Search,
  headphones: Headphones,
  star: Star,
  trophy: Trophy,
};

interface MobileMenuProps {
  links: NavLink[];
  user: User | null;
}

export function MobileMenu({ links, user }: MobileMenuProps) {
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="md:hidden p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-night-700/60 transition-colors"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {open && (
        <nav
          aria-label="Mobile navigation"
          className="md:hidden border-t border-blue-900/40 bg-night/95 px-4 py-3 flex flex-col gap-1"
        >
          {links.map(({ href, label, icon, color }) => {
            const Icon = NAV_ICONS[icon];
            return (
              <Link
                key={href}
                href={href}
                onClick={close}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-300 hover:text-white hover:bg-night-700/60 transition-colors"
              >
                <Icon className={`w-4 h-4 ${color}`} />
                <span>{label}</span>
              </Link>
            );
          })}

          <div className="mt-2 pt-2 border-t border-blue-900/40">
            {user ? (
              <>
                <div className="flex items-center gap-2.5 px-3 py-2.5">
                  {user.user_metadata?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.user_metadata.avatar_url as string}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover border border-night-700"
                    />
                  ) : (
                    <WolfMascot size={28} mood="happy" />
                  )}
                  <span className="text-sm font-semibold text-white truncate">
                    {(user.user_metadata?.full_name as string | undefined) ??
                      user.email ??
                      "Wolf"}
                  </span>
                </div>
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-300 hover:text-white hover:bg-night-700/60 transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-zinc-400" />
                    <span>Sign Out</span>
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/auth/login"
                onClick={close}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-300 hover:text-white hover:bg-night-700/60 transition-colors"
              >
                <LogIn className="w-4 h-4 text-zinc-400" />
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </nav>
      )}
    </>
  );
}