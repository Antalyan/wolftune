export type NavLinkIcon = "search" | "headphones" | "star" | "trophy" | "users";

export interface NavLink {
  href: string;
  label: string;
  icon: NavLinkIcon;
  color: string;
  authOnly?: boolean;
}

export const navLinks: NavLink[] = [
  { href: "/search", label: "Search & Rate", icon: "search", color: "text-zinc-400" },
  { href: "/game", label: "Guess Game", icon: "headphones", color: "text-emerald-400" },
  { href: "/leaderboard", label: "Leaderboard", icon: "trophy", color: "text-amber-400" },
  { href: "/groups", label: "Groups", icon: "users", color: "text-wolf-400", authOnly: true },
];
