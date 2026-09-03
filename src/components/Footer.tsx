import Link from "next/link";
import { WolfMascot } from "./WolfMascot";
import { Disc3, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-blue-900/40 bg-night/60 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <WolfMascot size={44} mood="happy" />
            <div>
              <p className="text-sm font-semibold text-white">WolfTune</p>
              <p className="text-xs text-zinc-400">Rate your favorite tracks & test your musical ears.</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-zinc-400">
            <Link href="/about" className="hover:text-blue-300 transition-colors">
              About
            </Link>
            <Link href="/privacy" className="hover:text-blue-300 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-blue-300 transition-colors">
              Terms of Service
            </Link>
            <div className="flex items-center gap-1.5 text-zinc-500">
              <Disc3 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Powered by Spotify API</span>
            </div>
          </div>

          <p className="text-xs text-zinc-500 flex items-center gap-1">
            Built with <Heart className="w-3 h-3 text-red-500 fill-red-500 inline" /> for music lovers
          </p>
        </div>
      </div>
    </footer>
  );
}
