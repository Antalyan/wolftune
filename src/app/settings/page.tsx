import { createClient } from "@/lib/supabase/server";
import { WolfMascot } from "@/components/WolfMascot";
import { Settings as SettingsIcon } from "lucide-react";
import { CredentialsForm } from "./CredentialsForm";

export const metadata = {
  title: "Settings — WolfTune",
  description: "Manage your WolfTune profile and Spotify connection.",
};

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <WolfMascot size={80} mood="listening" />
        <h2 className="mt-6 text-2xl font-bold text-white">
          Sign in to manage settings
        </h2>
      </div>
    );
  }

  // Fetch profile + group membership
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, spotify_client_id, spotify_client_secret")
    .eq("id", session.user.id)
    .single();

  const { data: memberships } = await supabase
    .from("group_members")
    .select("groups (id, name, spotify_client_id)")
    .eq("user_id", session.user.id);

  const inGroupWithCreds = (memberships ?? []).some((m) => m.groups?.spotify_client_id);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 w-full">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon className="w-6 h-6 text-blue-400" />
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">
          Your Spotify credentials
        </h2>
        <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
          WolfTune needs your own Spotify Developer credentials to search for
          music. These are stored privately in your profile.
          {inGroupWithCreds && (
            <span className="text-spotify-green">
              {" "}
              Your group also provides shared credentials, so you can use those
              instead.
            </span>
          )}
        </p>

        <div className="bg-night-800/60 border border-night-700 rounded-xl p-4 mb-4">
          {profile?.spotify_client_id ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-zinc-400">Client ID:</span>
              <code className="font-mono text-white text-xs bg-night-900 px-2 py-1 rounded">
                {profile.spotify_client_id}
              </code>
              <span className="text-zinc-500 text-xs">
                (Secret: {profile.spotify_client_secret ? "***" : "not set"})
              </span>
            </div>
          ) : (
            <p className="text-sm text-zinc-400">
              No personal credentials saved yet.
            </p>
          )}
        </div>

        <CredentialsForm
          initialClientId={profile?.spotify_client_id ?? null}
          hasSavedCredentials={Boolean(profile?.spotify_client_id)}
        />

        <div className="mt-4 text-xs text-zinc-500">
          <p className="mb-1 font-semibold text-zinc-400">
            How to get your credentials:
          </p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>
              Go to{" "}
              <a
                href="https://developer.spotify.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="text-spotify-green hover:underline"
              >
                developer.spotify.com/dashboard
              </a>
            </li>
            <li>Create a new app or use an existing one</li>
            <li>Copy the Client ID and Client Secret below</li>
            <li>
              Make sure your app has a redirect URI configured in the Spotify
              dashboard
            </li>
          </ol>
        </div>
      </section>
    </div>
  );
}
