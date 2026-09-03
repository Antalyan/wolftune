import { ScrollText } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10 w-full">
      <div className="flex items-center gap-2 mb-6">
        <ScrollText className="w-6 h-6 text-blue-500" />
        <h1 className="text-2xl font-bold text-white">Terms of Service</h1>
      </div>
      <div className="space-y-4 text-xs text-zinc-400 leading-relaxed">
        <p>The terms of service content for WolfTune will be finalized here.</p>
        <p>Last updated: September 2026</p>
      </div>
    </div>
  );
}