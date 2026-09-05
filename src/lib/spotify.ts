import {
  SpotifyAlbumSummary,
  SpotifyPlaylistSummary,
  SpotifySearchResults,
  SpotifySearchType,
  SpotifyTrack,
} from "@/types/spotify";

export interface SpotifyCredentials {
  clientId: string;
  clientSecret: string;
}

export class SpotifyApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "SpotifyApiError";
    this.status = status;
  }
}

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API_BASE = "https://api.spotify.com/v1";
const TOKEN_EXPIRY_MARGIN_MS = 60_000;

/**
 * Per-credential-pair token cache. Keyed by client ID so user/group
 * credentials don\'t collide with each other or with env-var creds.
 */
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

/** True when env-var Spotify API credentials are present (fallback). */
export function isSpotifyConfigured(): boolean {
  return Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

/**
 * Client Credentials flow with a per-client cache.
 * When `creds` is omitted, falls back to env vars (backward compat).
 */
async function getAccessToken(creds?: SpotifyCredentials): Promise<string> {
  const clientId = creds?.clientId ?? process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = creds?.clientSecret ?? process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new SpotifyApiError(
      "Spotify is not configured — missing SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET."
    );
  }

  const cacheKey = clientId;
  const cached = tokenCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt - TOKEN_EXPIRY_MARGIN_MS) {
    return cached.token;
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
    cache: "no-store",
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    // Spotify returns 400 invalid_client when the ID/Secret pair is wrong.
    if (res.status === 400 && bodyText.includes("invalid_client")) {
      throw new SpotifyApiError(
        "Spotify rejected the credentials (invalid_client) — the Client ID or Client Secret is wrong.",
        400
      );
    }
    throw new SpotifyApiError(`Spotify token request failed with status ${res.status}.`, res.status);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache.set(cacheKey, {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  });
  return data.access_token;
}

/**
 * Build a descriptive SpotifyApiError from a failed Web API response.
 * Includes Spotify's own error body (reason) instead of hiding it behind
 * a generic "status NNN" message.
 */
async function apiErrorFromResponse(context: string, res: Response): Promise<SpotifyApiError> {
  const bodyText = await res.text().catch(() => "");
  let reason = "";
  try {
    const parsed = JSON.parse(bodyText) as { error?: { message?: string } | string };
    if (typeof parsed.error === "string") reason = parsed.error;
    else if (parsed.error?.message) reason = parsed.error.message;
  } catch {
    if (bodyText) reason = bodyText.slice(0, 200);
  }
  const detail = reason ? `: ${reason}` : "";
  return new SpotifyApiError(`Spotify ${context} request failed with status ${res.status}${detail}.`, res.status);
}

/** Authenticated GET against the Web API; retries once with a fresh token on 401. */
/** Authenticated GET against the Web API; retries once with a fresh token on 401. */
export async function spotifyFetch<T>(path: string, creds?: SpotifyCredentials): Promise<T> {
  const token = await getAccessToken(creds);
  const first = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (first.status !== 401) {
    if (!first.ok) {
      throw await apiErrorFromResponse("search/API", first);
    }
    return (await first.json()) as T;
  }

  tokenCache.delete(creds?.clientId ?? process.env.SPOTIFY_CLIENT_ID ?? "");
  const second = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${await getAccessToken(creds)}` },
    cache: "no-store",
  });
  if (!second.ok) {
    throw await apiErrorFromResponse("search/API (after token refresh)", second);
  }
  return (await second.json()) as T;
}
/* ------------------------------------------------------------------ */
/* Raw Web API shapes (only the fields we actually use)                */
/* ------------------------------------------------------------------ */

interface RawImage {
  url: string;
  height?: number | null;
  width?: number | null;
}

interface RawArtist {
  id: string;
  name: string;
}

interface RawTrack {
  id: string;
  name: string;
  artists: RawArtist[];
  album?: {
    id: string;
    name: string;
    images: RawImage[] | null;
    release_date?: string | null;
    artists?: RawArtist[];
    total_tracks?: number;
  } | null;
  duration_ms?: number;
  uri?: string | null;
  preview_url?: string | null;
  explicit?: boolean;
  popularity?: number;
}

interface RawAlbum {
  id: string;
  name: string;
  artists: RawArtist[];
  images: RawImage[] | null;
  release_date?: string | null;
  total_tracks?: number;
  album_type?: string;
}

interface RawSearchResponse {
  tracks?: { items: RawTrack[] | null } | null;
  albums?: { items: RawAlbum[] | null } | null;
  playlists?: {
    items: {
      id: string;
      name: string;
      images: RawImage[] | null;
      owner?: { display_name?: string | null } | null;
      tracks?: { total?: number | null } | null;
      description?: string | null;
    }[] | null;
  } | null;
}

/* ------------------------------------------------------------------ */
/* Normalizers                                                        */
/* ------------------------------------------------------------------ */

function mapImages(images: RawImage[] | null | undefined): { url: string; width: number | null; height: number | null }[] {
  if (!images) return [];
  return images
    .filter((img): img is RawImage => Boolean(img?.url))
    .map((img) => ({ url: img.url, width: img.width ?? null, height: img.height ?? null }))
    .sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
}

function mapArtist(a: RawArtist): { id: string; name: string } {
  return { id: a.id, name: a.name };
}

function mapTrack(t: RawTrack): SpotifyTrack {
  return {
    id: t.id,
    name: t.name,
    artists: (t.artists ?? []).map(mapArtist),
    album: t.album
      ? {
          id: t.album.id,
          name: t.album.name,
          images: mapImages(t.album.images),
          release_date: t.album.release_date ?? null,
          artists: (t.album.artists ?? []).map(mapArtist),
          total_tracks: t.album.total_tracks ?? 0,
        }
      : {
          id: "",
          name: t.name,
          images: [],
          release_date: null,
          artists: (t.artists ?? []).map(mapArtist),
          total_tracks: 0,
        },
    duration_ms: t.duration_ms ?? 0,
    uri: t.uri ?? null,
    preview_url: t.preview_url ?? null,
    explicit: t.explicit ?? false,
    popularity: t.popularity ?? 0,
  };
}

function mapAlbum(a: RawAlbum): SpotifyAlbumSummary {
  return {
    id: a.id,
    name: a.name,
    artists: (a.artists ?? []).map(mapArtist),
    images: mapImages(a.images),
    release_date: a.release_date ?? null,
    total_tracks: a.total_tracks ?? 0,
    album_type: a.album_type ?? "",
  };
}

/* ------------------------------------------------------------------ */
/* Public search                                                      */
/* ------------------------------------------------------------------ */

export interface SearchOptions {
  types?: SpotifySearchType[];
  limit?: number;
  credentials?: SpotifyCredentials;
  /**
   * ISO 3166-1 alpha-2 country code (e.g. "US"). The Spotify /search endpoint
   * REQUIRES `market` when using the Client Credentials flow (no signed-in
   * user) — omitting it returns "400 Bad Request". Defaults to an env var,
   * falling back to "US".
   */
  market?: string;
}

/**
 * Live Spotify search across tracks / albums / playlists.
 * Throws SpotifyApiError on failure — callers decide on fallbacks.
 */
export async function searchSpotify(
  query: string,
  options: SearchOptions = {}
): Promise<SpotifySearchResults> {
  const types = options.types ?? ["track", "album", "playlist"];
  // NOTE: Spotify caps search `limit` at 10 for apps in development mode
  // (unextended quota) — higher values return "400 Invalid limit".
  const limit = Math.min(Math.max(options.limit ?? 10, 1), 10);
  const market = options.market ?? process.env.SPOTIFY_MARKET ?? "US";
  const params = new URLSearchParams({
    q: query,
    type: types.join(","),
    limit: String(limit),
    market,
  });

  const data = await spotifyFetch<RawSearchResponse>(`/search?${params.toString()}`, options.credentials);

  return {
    tracks: (data.tracks?.items ?? []).filter((t) => t?.id).map(mapTrack),
    albums: (data.albums?.items ?? []).filter((a) => a?.id).map(mapAlbum),
    playlists: (data.playlists?.items ?? [])
      .filter((p) => p?.id)
      .map((p) => ({
        id: p.id,
        name: p.name,
        images: mapImages(p.images),
        owner_name: p.owner?.display_name ?? "Unknown",
        total_tracks: p.tracks?.total ?? null,
        description: p.description ?? null,
      })),
    source: "spotify",
  };
}

/** Full album object incl. its tracklist. */
export async function getAlbumWithTracks(
  albumId: string,
  credentials?: SpotifyCredentials
): Promise<{ album: SpotifyAlbumSummary; tracks: SpotifyTrack[] }> {
  const raw = await spotifyFetch<RawAlbum & { tracks?: { items: RawTrack[] | null } }>(
    `/albums/${encodeURIComponent(albumId)}`,
    credentials
  );

  return {
    album: mapAlbum(raw),
    tracks: (raw.tracks?.items ?? []).filter((t) => t?.id).map(mapTrack),
  };
}

/** Public playlist incl. its tracks (local/removed items are skipped). */
export async function getPlaylistWithTracks(
  playlistId: string,
  credentials?: SpotifyCredentials
): Promise<{ playlist: SpotifyPlaylistSummary; tracks: SpotifyTrack[] }> {
  type RawPlaylistPage = {
    id: string;
    name: string;
    images: RawImage[] | null;
    description: string | null;
    owner?: { display_name?: string | null };
    tracks?: {
      total?: number | null;
      items?: { track: RawTrack | null }[] | null;
      next?: string | null;
    };
  };

  // NOTE: do NOT use `fields=` here — Spotify returns a broken `total` (0) and
  // partial items with that parameter. Fetch the full object and paginate.
  const raw = await spotifyFetch<RawPlaylistPage>(
    `/playlists/${encodeURIComponent(playlistId)}?limit=100`,
    credentials
  );

  const rawItems: { track: RawTrack | null }[] = [...(raw.tracks?.items ?? [])];
  let nextUrl = raw.tracks?.next ?? null;
  // Safety cap so a pathological 10k-track playlist can't stall a request.
  let guard = 5;
  while (nextUrl && guard-- > 0) {
    const url = new URL(nextUrl);
    const page = await spotifyFetch<RawPlaylistPage>(
      `${url.pathname}${url.search}`,
      credentials
    );
    rawItems.push(...(page.tracks?.items ?? []));
    nextUrl = page.tracks?.next ?? null;
  }

  const tracks = rawItems
    .map((item) => item.track)
    .filter((t): t is RawTrack => Boolean(t?.id))
    .map(mapTrack);

  return {
    playlist: {
      id: raw.id,
      name: raw.name,
      images: mapImages(raw.images),
      owner_name: raw.owner?.display_name ?? "Unknown",
      total_tracks: raw.tracks?.total ?? tracks.length,
      description: raw.description ?? null,
    },
    tracks,
  };
}

/** Offline fallback used by /api/search when no API keys are configured. */
export function getMockSearch(query: string, types: SpotifySearchType[]): SpotifySearchResults {
  const q = query.toLowerCase();
  const tracks = types.includes("track")
    ? MOCK_TRACKS.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.artists.some((a) => a.name.toLowerCase().includes(q)) ||
          t.album?.name.toLowerCase().includes(q)
      )
    : [];

  return { tracks, albums: [], playlists: [], source: "mock" };
}

export function getGamePool(): SpotifyTrack[] {
  return MOCK_TRACKS;
}
const MOCK_TRACKS: SpotifyTrack[] = [
  {
    id: "mock-1",
    name: "Blinding Lights",
    artists: [{ id: "a1", name: "The Weeknd" }],
    album: {
      id: "al1",
      name: "After Hours",
      images: [{ url: "", width: null, height: null }],
      release_date: "2020-03-20",
      artists: [{ id: "a1", name: "The Weeknd" }],
      total_tracks: 14,
    },
    duration_ms: 200000,
    uri: null,
    preview_url: null,
    explicit: false,
    popularity: 80,
  },
  {
    id: "mock-2",
    name: "Levitating",
    artists: [{ id: "a2", name: "Dua Lipa" }],
    album: {
      id: "al2",
      name: "Future Nostalgia",
      images: [{ url: "", width: null, height: null }],
      release_date: "2020-03-27",
      artists: [{ id: "a2", name: "Dua Lipa" }],
      total_tracks: 11,
    },
    duration_ms: 203000,
    uri: null,
    preview_url: null,
    explicit: false,
    popularity: 75,
  },
  {
    id: "mock-3",
    name: "Save Your Tears",
    artists: [{ id: "a1", name: "The Weeknd" }],
    album: {
      id: "al1",
      name: "After Hours",
      images: [{ url: "", width: null, height: null }],
      release_date: "2020-03-20",
      artists: [{ id: "a1", name: "The Weeknd" }],
      total_tracks: 14,
    },
    duration_ms: 215000,
    uri: null,
    preview_url: null,
    explicit: false,
    popularity: 78,
  },
  {
    id: "mock-4",
    name: "Peaches",
    artists: [{ id: "a3", name: "Justin Bieber" }, { id: "a4", name: "Daniel Caesar" }],
    album: {
      id: "al3",
      name: "Justice",
      images: [{ url: "", width: null, height: null }],
      release_date: "2021-03-19",
      artists: [{ id: "a3", name: "Justin Bieber" }],
      total_tracks: 16,
    },
    duration_ms: 198000,
    uri: null,
    preview_url: null,
    explicit: false,
    popularity: 70,
  },
  {
    id: "mock-5",
    name: "Kiss Me More",
    artists: [{ id: "a5", name: "Doja Cat" }, { id: "a6", name: "SZA" }],
    album: {
      id: "al4",
      name: "Planet Her",
      images: [{ url: "", width: null, height: null }],
      release_date: "2021-06-25",
      artists: [{ id: "a5", name: "Doja Cat" }],
      total_tracks: 14,
    },
    duration_ms: 208000,
    uri: null,
    preview_url: null,
    explicit: false,
    popularity: 72,
  },
];
