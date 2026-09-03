import { hasSpotifyCredentials } from "@/lib/spotify-credentials";
import { CredentialGate } from "@/components/CredentialGate";
import SearchClient from "./search-client";

export const dynamic = "force-dynamic";

export default async function SearchPage() {
  const hasCreds = await hasSpotifyCredentials();

  if (!hasCreds) {
    return <CredentialGate page="search" />;
  }

  return <SearchClient />;
}
