"use client";

import Link from "next/link";
import { KeyRound, Users } from "lucide-react";

interface CredentialGateProps {
  /** Page name shown in the message, e.g. "search", "rate", "play". */
  page: string;
}

/**
 * Full-page gate shown when the current user has no way to call the Spotify
 * API — no personal credentials and no group with credentials. Directs them
 * to Settings (personal) or Groups (join/create).
 */
export function CredentialGate({ page }: CredentialGateProps) {
  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-night-800 border border-night-700 mb-5">
        <KeyRound className="w-7 h-7 text-wolf-400" />
      </div>
      <h1 className="text-2xl font-bold text-white mb-2">Spotify credentials needed</h1>
      <p className="text-sm text-zinc-400 leading-relaxed mb-6">
        To {page} music, WolfTune needs a Spotify Developer Client ID & Secret. You can add your own
        in Settings, or join a group that already has one.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-wolf-600 hover:bg-wolf-500 text-white text-sm font-bold transition-colors"
        >
          <KeyRound className="w-4 h-4" />
          Add personal credentials
        </Link>
        <Link
          href="/groups"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-night-700 hover:border-wolf-700/50 text-zinc-300 text-sm font-semibold transition-colors"
        >
          <Users className="w-4 h-4" />
          Join or create a group
        </Link>
      </div>
    </div>
  );
}
