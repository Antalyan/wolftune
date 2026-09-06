export interface SpotifyImage {
  url: string;
  /** The API sometimes omits dimensions for fallback imagery. */
  height: number | null;
  width: number | null;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  genres?: string[];
  images?: SpotifyImage[];
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  images: SpotifyImage[];
  release_date: string | null;
  total_tracks: number;
  artists: SpotifyArtist[];
}

export interface SpotifyTrack {
  id: string;
  name: string;
  /** Spotify track URI (spotify:track:…) — needed for full-track playback. */
  uri: string | null;
  preview_url: string | null;
  duration_ms: number;
  explicit: boolean;
  popularity: number;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
}

/** Album-level summary used in search results and listing pages. */
export interface SpotifyAlbumSummary {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  images: SpotifyImage[];
  release_date: string | null;
  total_tracks: number;
  album_type: string;
}

/** Playlist-level summary used in search results and the guessing-game picker. */
export interface SpotifyPlaylistSummary {
  id: string;
  name: string;
  images: SpotifyImage[];
  owner_name: string;
  /** null = unknown (Spotify no longer includes track counts in search results). */
  total_tracks: number | null;
  description: string | null;
}

export type SpotifySearchType = "track" | "album" | "playlist";

/** Normalized search payload returned by /api/search. */
export interface SpotifySearchResults {
  tracks: SpotifyTrack[];
  albums: SpotifyAlbumSummary[];
  playlists: SpotifyPlaylistSummary[];
  /** "spotify" = live Web API results; "mock" = offline fallback (no API keys). */
  source: "spotify" | "mock";
}
