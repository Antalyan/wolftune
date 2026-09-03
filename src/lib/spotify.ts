import { SpotifyTrack } from "@/types/spotify";

const MOCK_TRACKS: SpotifyTrack[] = [
  {
    id: "1",
    name: "Blinding Lights",
    preview_url: "https://p.scdn.co/mp3-preview/b22030d995c76e28e932463e26b21696237004f8?cid=cfe928b2b280425880a422004450d6f2",
    duration_ms: 200040,
    explicit: false,
    popularity: 95,
    artists: [{ id: "a1", name: "The Weeknd" }],
    album: {
      id: "al1",
      name: "After Hours",
      images: [{ url: "https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36", height: 640, width: 640 }],
      release_date: "2020-03-20",
      total_tracks: 14,
      artists: [{ id: "a1", name: "The Weeknd" }],
    },
  },
  {
    id: "2",
    name: "Midnight City",
    preview_url: "https://p.scdn.co/mp3-preview/a64a38e07897d2643a055be1f86d633333ee8ee6?cid=cfe928b2b280425880a422004450d6f2",
    duration_ms: 243000,
    explicit: false,
    popularity: 88,
    artists: [{ id: "a2", name: "M83" }],
    album: {
      id: "al2",
      name: "Hurry Up, We're Dreaming",
      images: [{ url: "https://i.scdn.co/image/ab67616d0000b27396c0926c48fb07d1302c3be9", height: 640, width: 640 }],
      release_date: "2011-10-18",
      total_tracks: 22,
      artists: [{ id: "a2", name: "M83" }],
    },
  },
  {
    id: "3",
    name: "As It Was",
    preview_url: "https://p.scdn.co/mp3-preview/0d9860b2404eb58c67c5e317c2a7147b4d31484f?cid=cfe928b2b280425880a422004450d6f2",
    duration_ms: 167303,
    explicit: false,
    popularity: 92,
    artists: [{ id: "a3", name: "Harry Styles" }],
    album: {
      id: "al3",
      name: "Harry's House",
      images: [{ url: "https://i.scdn.co/image/ab67616d0000b2732e8f6371050e04e76ea0dd79", height: 640, width: 640 }],
      release_date: "2022-05-20",
      total_tracks: 13,
      artists: [{ id: "a3", name: "Harry Styles" }],
    },
  },
  {
    id: "4",
    name: "Get Lucky",
    preview_url: "https://p.scdn.co/mp3-preview/8a7a2a1bd7d0f10c66dbb72457813a35b0b3d68d?cid=cfe928b2b280425880a422004450d6f2",
    duration_ms: 248413,
    explicit: false,
    popularity: 89,
    artists: [{ id: "a4", name: "Daft Punk" }, { id: "a5", name: "Pharrell Williams" }],
    album: {
      id: "al4",
      name: "Random Access Memories",
      images: [{ url: "https://i.scdn.co/image/ab67616d0000b273b33d46e2730386db49ef7892", height: 640, width: 640 }],
      release_date: "2013-05-17",
      total_tracks: 13,
      artists: [{ id: "a4", name: "Daft Punk" }],
    },
  },
  {
    id: "5",
    name: "Take On Me",
    preview_url: "https://p.scdn.co/mp3-preview/3d13bd6c5f7d3a017f8a9a4e320d7e63b15f9d1d?cid=cfe928b2b280425880a422004450d6f2",
    duration_ms: 228000,
    explicit: false,
    popularity: 86,
    artists: [{ id: "a6", name: "a-ha" }],
    album: {
      id: "al5",
      name: "Hunting High and Low",
      images: [{ url: "https://i.scdn.co/image/ab67616d0000b2732d0b677a835b3eeef52b2f67", height: 640, width: 640 }],
      release_date: "1985-06-01",
      total_tracks: 10,
      artists: [{ id: "a6", name: "a-ha" }],
    },
  },
];

export async function searchTracks(query: string): Promise<SpotifyTrack[]> {
  if (!query || query.trim() === "") {
    return MOCK_TRACKS;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    // Return filtered mock results if API credentials are not set
    const q = query.toLowerCase();
    return MOCK_TRACKS.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.artists.some((a) => a.name.toLowerCase().includes(q)) ||
        t.album.name.toLowerCase().includes(q)
    );
  }

  try {
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      },
      body: "grant_type=client_credentials",
      next: { revalidate: 3600 },
    });

    if (!tokenRes.ok) return MOCK_TRACKS;
    const tokenData = await tokenRes.json();

    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=12`,
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }
    );

    if (!searchRes.ok) return MOCK_TRACKS;
    const searchData = await searchRes.json();
    return searchData.tracks?.items || MOCK_TRACKS;
  } catch {
    return MOCK_TRACKS;
  }
}

export function getGamePool(): SpotifyTrack[] {
  return MOCK_TRACKS;
}