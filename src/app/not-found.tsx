import Link from "next/link";
import { WolfMascot } from "@/components/WolfMascot";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-24 text-center">
      <div className="p-4 rounded-2xl bg-night-800 border border-blue-800/50">
        <WolfMascot size={110} mood="howling" />
      </div>

      <h1 className="mt-6 text-6xl font-extrabold text-white">404</h1>
      <p className="mt-2 text-lg font-semibold text-zinc-300">
        This track isn&apos;t in our playlist.
      </p>
      <p className="mt-1 text-sm text-zinc-400 max-w-sm">
        The page you&apos;re looking for doesn&apos;t exist or was moved. Let&apos;s get you back to the music.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
        >
          <Home className="w-4 h-4" /> Back Home
        </Link>
        <Link
          href="/search"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-night-800 border border-night-700 hover:border-blue-700/50 text-zinc-100 text-sm font-semibold transition-colors"
        >
          <Search className="w-4 h-4" /> Search Music
        </Link>
      </div>
    </div>
  );
}