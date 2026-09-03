import { Shield } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10 w-full">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="w-6 h-6 text-blue-500" />
        <h1 className="text-2xl font-bold text-white">Privacy Policy</h1>
      </div>
      <div className="space-y-4 text-xs text-zinc-400 leading-relaxed">
        <p>The privacy policy content for WolfTune will be finalized here.</p>
        <p>Last updated: September 2026</p>
      </div>
    </div>
  );
}