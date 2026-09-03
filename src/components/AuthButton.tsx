import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { LogIn, LogOut } from "lucide-react";

interface AuthButtonProps {
  user: User | null;
}

export function AuthButton({ user }: AuthButtonProps) {
  if (!user) {
    return (
      <Link
        href="/auth/login"
        className="flex items-center gap-2 text-sm font-medium text-zinc-300 hover:text-white px-3 py-2 rounded-lg hover:bg-night-700/60 transition-colors"
      >
        <LogIn className="w-4 h-4" />
        <span>Sign In</span>
      </Link>
    );
  }

  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const fullName = user.user_metadata?.full_name as string | undefined;
  const name = fullName ?? user.email ?? "Wolf";
  const initials = name.trim().charAt(0).toUpperCase();

  return (
    <form action="/auth/signout" method="post">
      <button
        type="submit"
        title={`Sign out ${name}`}
        className="flex items-center gap-2 text-sm font-medium text-zinc-300 hover:text-white px-2 py-1.5 rounded-lg hover:bg-night-700/60 transition-colors"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={name}
            width={28}
            height={28}
            className="w-7 h-7 rounded-full object-cover border border-night-700"
          />
        ) : (
          <span className="w-7 h-7 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-xs font-bold text-blue-200">
            {initials}
          </span>
        )}
        <span className="hidden lg:inline max-w-[8rem] truncate">{name}</span>
        <LogOut className="w-3.5 h-3.5 text-zinc-500 hidden lg:inline" />
      </button>
    </form>
  );
}