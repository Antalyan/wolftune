import { hasSpotifyCredentials } from "@/lib/spotify-credentials";
import { CredentialGate } from "@/components/CredentialGate";
import GameClient from "./game-client";

export const dynamic = "force-dynamic";

export default async function GamePage() {
  const hasCreds = await hasSpotifyCredentials();

  if (!hasCreds) {
    return <CredentialGate page="game" />;
  }

  return <GameClient />;
}
