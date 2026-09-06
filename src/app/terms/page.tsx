import Link from "next/link";

export const metadata = {
  title: "Terms of Service — WolfTune",
  description: "The terms governing your use of WolfTune.",
};

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <Link href="/" className="text-sm text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 mb-6">
        ← Back to WolfTune
      </Link>

      <h1 className="text-3xl font-extrabold text-white mb-2">Terms of Service</h1>
      <p className="text-sm text-zinc-500 mb-8">Last updated: September 2026</p>

      <div className="space-y-8 text-sm text-zinc-300 leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-white mb-2">1. Acceptance of Terms</h2>
          <p>
            By accessing or using WolfTune, you agree to be bound by these Terms of Service. If you do
            not agree, do not use the application.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">2. Description of Service</h2>
          <p>
            WolfTune is a music rating and guessing game web app built on top of the Spotify Web API.
            It lets users browse music, rate tracks/albums/playlists, and play an adaptive guessing
            game over their own Spotify playlists.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">3. User Accounts</h2>
          <p>
            You must sign up with a valid email address. You are responsible for maintaining the
            security of your account credentials. You must be at least 13 years old to use WolfTune.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">4. Spotify Connection</h2>
          <p>
            WolfTune requires you to connect your own Spotify account via OAuth to access playlist and
            playback features. You are responsible for ensuring your use of WolfTune complies with{" "}
            <a
              href="https://developer.spotify.com/terms/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Spotify Developer Platform Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="https://www.spotify.com/legal/end-user-agreement/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Spotify User Guidelines
            </a>
            .
          </p>
          <p className="mt-2">
            Full-track playback in the guessing game requires a Spotify Premium subscription, which is
            sold separately by Spotify. WolfTune is not affiliated with or endorsed by Spotify.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">5. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-400">
            <li>Use WolfTune for any unlawful purpose.</li>
            <li>Attempt to access another user&apos;s data without authorization.</li>
            <li>Share group credentials outside your group.</li>
            <li>Interfere with or disrupt the service or its infrastructure.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">6. User-Generated Content</h2>
          <p>
            Ratings, notes, and guessing game data you create are tied to your account. You retain
            ownership of your content. WolfTune stores and displays it to provide the service and
            within groups you join.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">7. Termination</h2>
          <p>
            You may delete your account at any time from Settings. WolfTune reserves the right to
            suspend or terminate accounts that violate these terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">8. Disclaimer of Warranties</h2>
          <p>
            WolfTune is provided &quot;as is&quot; without warranties of any kind. We do not guarantee
            uninterrupted or error-free service. Spotify data availability depends on Spotify&apos;s
            API and is outside our control.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">9. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, WolfTune shall not be liable for any indirect,
            incidental, or consequential damages arising from your use of the service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">10. Changes to Terms</h2>
          <p>
            We may update these terms. Material changes will be noted with an updated &quot;Last
            updated&quot; date. Continued use after changes constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">11. Contact</h2>
          <p>
            Questions about these terms can be directed to the WolfTune project repository.
          </p>
        </section>
      </div>
    </main>
  );
}
