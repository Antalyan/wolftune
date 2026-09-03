"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface CopyInviteCodeButtonProps {
  inviteCode: string;
}

export function CopyInviteCodeButton({ inviteCode }: CopyInviteCodeButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — silently fail.
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="p-1.5 text-zinc-400 hover:text-white transition-colors"
      aria-label="Copy invite code"
      title="Copy invite code"
    >
      {copied ? (
        <Check className="w-4 h-4 text-spotify-green" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </button>
  );
}
