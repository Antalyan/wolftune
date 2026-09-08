import { createClient } from "@/lib/supabase/server";
import { WolfMascot } from "@/components/WolfMascot";
import { Settings as SettingsIcon } from "lucide-react";
import { CredentialsForm } from "./CredentialsForm";
import { UsernameForm } from "./UsernameForm";
import { disconnectSpotify } from "./actions";
import { ConnectSpotifyButton } from "@/components/ConnectSpotifyButton";

export const metadata = {
  title: "Settings — WolfTune",
  description: "Manage your WolfTune profile and Spotify connection.",
};

const STATUS_MESSAGES: Record<string, { text: string; ok: boolean }> = {
  connected: { text: "Spotify connected! Your playlists are now available on the Rate page.", ok: true },
  need_credentials: {
    text: "Save your Spotify Client ID and Secret first, then connect Spotify.",
    ok: false,
  },
  state_mismatch: { text: "Connection failed (security check). Please try again.", ok: false },
  missing_params: { text: "Connection failed (missing parameters). Please try again.", ok: false },
  access_denied: { text: "You declined the Spotify permission request.", ok: false },
  exchange_400: { text: "Token exchange failed — check that your Client ID/Secret are correct and the redirect URI in your Spotify app is exactly the one shown below.", ok: false },
  exchange_401: { text: "Token exchange failed (invalid client credentials).", ok: false },
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const spotifyFlag = typeof params.spotify === "string" ? params.spotify : null;
  const status = spotifyFlag ? STATUS_MESSAGES[spotifyFlag] : undefined;
  const confirmDisconnect = spotifyFlag === "confirm_disconnect";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <WolfMascot size={80} mood="listening" />
        <h2 className="mt-6 text-2xl font-bold text-white">
          Sign in to manage settings
        </h2>
      </div>
    );
  }

  const userId = user.id;

  // Fetch profile + group membership
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, spotify_client_id, spotify_client_secret")
    .eq("id", userId)
    .single();

  const { data: memberships } = await supabase
    .from("group_members")
    .select("groups (id, name, spotify_client_id)")
    .eq("user_id", userId);

  const inGroupWithCreds = (memberships ?? []).some((m) => m.groups?.spotify_client_id);

  // Connection status: a stored refresh token means Spotify is connected.
  const { data: tokenRow } = await supabase
    .from("spotify_tokens")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  const isConnected = Boolean(tokenRow);

  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000"}/auth/spotify-callback`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 w-full">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon className="w-6 h-6 text-blue-400" />
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>

      {status && (
        <div
          className={`mb-6 px-4 py-3 rounded-xl border text-sm ${
            status.ok
              ? "bg-green-950/50 border-green-800/50 text-green-300"
              : "bg-red-950/50 border-red-800/50 text-red-300"
          }`}
        >
          {status.text}
        </div>
      )}

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">Profile</h2>
        <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
          Your nickname is what your group sees on rating plans, leaderboards and the
          members list.
        </p>
        <div className="bg-night-800/60 border border-night-700 rounded-xl p-4">
          <UsernameForm currentUsername={profile?.username ?? null} />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">Spotify connection</h2>
        <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
          Connecting lets WolfTune load <strong className="text-zinc-200">your own playlists</strong>{" "}
          (ones you own or collaborate on) with their full track lists, so you can rate them song by
          song. It uses your own Spotify app — no shared limits.
        </p>

        <div className="bg-night-800/60 border border-night-700 rounded-xl p-4 mb-4">
          {isConnected ? (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-green-400">
                <span className="w-2 h-2 rounded-full bg-spotify-green" />
                Spotify connected
              </div>
              {confirmDisconnect ? (
                <form action={disconnectSpotify} className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">Remove the connection?</span>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-red-900/60 border border-red-800 text-red-200 text-xs font-semibold hover:bg-red-900 transition"
                  >
                    Yes, disconnect
                  </button>
                  <a
                    href="/settings"
                    className="px-3 py-1.5 rounded-lg bg-night-900 border border-night-700 text-zinc-300 text-xs hover:border-night-500 transition"
                  >
                    Cancel
                  </a>
                </form>
              ) : (
                <a
                  href="/settings?spotify=confirm_disconnect"
                  className="px-3 py-1.5 rounded-lg bg-night-900 border border-night-700 text-zinc-300 text-xs hover:border-night-500 transition"
                >
                  Disconnect
                </a>
              )}
            </div>
          ) : profile?.spotify_client_id ? (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <p className="text-sm text-zinc-400">Not connected yet.</p>
              <ConnectSpotifyButton />
            </div>
          ) : (
            <p className="text-sm text-zinc-400">
              Save your Client ID and Secret below first — the connection uses your own Spotify app.
            </p>
          )}
        </div>

        {!isConnected && (
          <div className="text-xs text-zinc-500 mb-6">
            <p className="mb-1 font-semibold text-zinc-400">
              One-time setup — add this Redirect URI to your Spotify app:
            </p>
            <code className="font-mono text-spotify-green bg-night-900 px-2 py-1 rounded inline-block mb-2">
              {redirectUri}
            </code>
            <p>
              Spotify dashboard → your app → Settings → Edit → Redirect URIs → add the URI above →
              Save. Then click “Connect Spotify”.
            </p>
          </div>
        )}
      </section>

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
