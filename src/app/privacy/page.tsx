import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — WolfTune",
  description: "How WolfTune collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <Link href="/" className="text-sm text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 mb-6">
        ← Back to WolfTune
      </Link>

      <h1 className="text-3xl font-extrabold text-white mb-2">Privacy Policy</h1>
      <p className="text-sm text-zinc-500 mb-8">Last updated: September 2026</p>

      <div className="space-y-8 text-sm text-zinc-300 leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-white mb-2">1. Information We Collect</h2>
          <p>When you sign up for WolfTune, we collect:</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-400">
            <li><strong className="text-zinc-300">Account information</strong> — your email address and encrypted password, managed by our authentication provider (Supabase).</li>
            <li><strong className="text-zinc-300">Spotify connection</strong> — an OAuth refresh token that lets WolfTune access your Spotify data on your behalf. We never see your Spotify password.</li>
            <li><strong className="text-zinc-300">Usage data</strong> — your ratings, playlists you view, guessing game history, and group memberships.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">2. How We Use Your Information</h2>
          <p>We use your data solely to provide WolfTune&apos;s features:</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-400">
            <li>Authenticate you and maintain your session.</li>
            <li>Fetch your Spotify playlists, tracks, and metadata so you can browse, rate, and play them.</li>
            <li>Store your ratings, guessing game progress, and statistics.</li>
            <li>Enable group features where you choose to share credentials or compare ratings with other members.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">3. Spotify Data & OAuth</h2>
          <p>
            WolfTune uses the Spotify Web API. When you connect your Spotify account, you grant us permission
            to access specific data (your email, playlists you own or co-create, and playback controls) via
            Spotify&apos;s OAuth system. You can revoke this access at any time from your{" "}
            <a
              href="https://www.spotify.com/account/apps/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Spotify account settings
            </a>
            .
          </p>
          <p className="mt-2">
            We request the minimum scopes necessary: <code className="text-xs bg-night-800 px-1.5 py-0.5 rounded text-zinc-300">playlist-read-private</code>,{" "}
            <code className="text-xs bg-night-800 px-1.5 py-0.5 rounded text-zinc-300">playlist-read-collaborative</code>,{" "}
            <code className="text-xs bg-night-800 px-1.5 py-0.5 rounded text-zinc-300">user-read-email</code>,{" "}
            <code className="text-xs bg-night-800 px-1.5 py-0.5 rounded text-zinc-300">streaming</code>,{" "}
            <code className="text-xs bg-night-800 px-1.5 py-0.5 rounded text-zinc-300">user-read-playback-state</code>, and{" "}
            <code className="text-xs bg-night-800 px-1.5 py-0.5 rounded text-zinc-300">user-modify-playback-state</code>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">4. Data Storage & Security</h2>
          <p>
            Your data is stored in a PostgreSQL database hosted by Supabase with Row Level Security (RLS)
            policies that restrict access so you can only see your own information. Your Spotify OAuth
            refresh token is stored securely and never exposed to the browser. All traffic between your
            browser and WolfTune is encrypted via HTTPS.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">5. Data Sharing</h2>
          <p>
            We do not sell your personal data. The only sharing that occurs is within groups you
            voluntarily join — group members can see each other&apos;s ratings and (if shared) Spotify
            credentials. This is opt-in and controlled by group owners.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">6. Your Rights</h2>
          <p>You can:</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-400">
            <li>Request a copy of your data.</li>
            <li>Delete your account, which removes all your personal data from our systems.</li>
            <li>Disconnect Spotify at any time from WolfTune Settings or your Spotify account page.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">7. Cookies</h2>
          <p>
            WolfTune uses essential cookies for authentication (session management). No tracking or
            advertising cookies are used.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">8. Contact</h2>
          <p>
            For privacy questions or data requests, contact the WolfTune team via the project repository.
          </p>
        </section>
      </div>
    </main>
  );
}
