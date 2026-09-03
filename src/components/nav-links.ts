/**
 * Shared navigation config — safe to import from both Server and Client
 * Components. Icon components themselves are NOT stored here (functions can't
 * cross the Server → Client Component serialization boundary); each side maps
 * the string `icon` key to a Lucide component locally.
 */
export type NavLinkIcon = "search" | "headphones" | "star" | "trophy";

export interface NavLink {
  href: string;
  label: string;
  icon: NavLinkIcon;
  color: string;
}

export const navLinks: NavLink[] = [
  { href: "/search", label: "Search & Rate", icon: "search", color: "text-zinc-400" },
  { href: "/game", label: "Guess Game", icon: "headphones", color: "text-emerald-400" },
  { href: "/reviews", label: "Community Reviews", icon: "star", color: "text-yellow-400" },
  { href: "/leaderboard", label: "Leaderboard", icon: "trophy", color: "text-amber-400" },
];
