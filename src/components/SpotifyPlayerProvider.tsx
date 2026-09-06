"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
/* The Web Playback SDK (loaded lazily) attaches itself to window.Spotify. */
interface SpotifySdkPlayer {
  connect(): Promise<boolean>;
  disconnect(): void;
  pause(): Promise<void>;
  resume(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  addListener(event: "ready", cb: (state: { device_id: string }) => void): boolean;
  addListener(event: "not_ready", cb: (state: { device_id: string }) => void): boolean;
  addListener(event: string, cb: (payload: { message?: string; device_id?: string }) => void): boolean;
}

declare global {
  interface Window {
    Spotify?: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifySdkPlayer;
    };
  }
}

interface SpotifyPlayerContextValue {
  /** Connect-device id of this browser tab's player (null until ready). */
  deviceId: string | null;
  /** True once the SDK finished initializing (connected or not). */
  ready: boolean;
  /** URI of the snippet currently playing, if any. */
  playingUri: string | null;
  /**
   * Plays a track starting at `offsetMs`. If `durationMs` is provided, playback
   * auto-pauses after that long; otherwise the track plays in full. Requires
   * Spotify Premium.
   */
  playSnippet: (uri: string, offsetMs?: number, durationMs?: number) => Promise<void>;
  stop: () => Promise<void>;
  /** Pauses current playback (full-track or fallback audio). */
  pause: () => Promise<void>;
  /** Resumes previously paused playback (full-track or fallback audio). */
  resume: () => Promise<void>;
}

const SpotifyPlayerContext = createContext<SpotifyPlayerContextValue | null>(null);

const SDK_URL = "https://sdk.scdn.co/spotify-player.js";
const SNIPPET_MAX_MS = 30_000;

function loadSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Spotify) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      return;
    }
    // The SDK calls window.onSpotifyWebPlaybackSDKReady once loaded — define it
    // BEFORE injecting the script to avoid "not defined" errors.
    (window as unknown as { onSpotifyWebPlaybackSDKReady?: () => void }).onSpotifyWebPlaybackSDKReady =
      () => resolve();
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Failed to load the Spotify Web Playback SDK.")));
    document.body.appendChild(script);
  });
}

/**
 * Wraps the app in a Spotify Connect device (Web Playback SDK) so any page can
 * play full-track snippets. Playback requires the user to have linked a
 * Spotify Premium account; otherwise the provider stays idle and harmless.
 */
export function SpotifyPlayerProvider({ children }: { children: ReactNode }) {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [playingUri, setPlayingUri] = useState<string | null>(null);
  const playerRef = useRef<SpotifySdkPlayer | null>(null);
  const snippetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getProviderToken = useCallback(async (): Promise<string | null> => {
    // The app connects Spotify through its own OAuth flow (refresh token stored
    // in `spotify_tokens`), NOT Supabase's built-in Spotify provider. So we get
    // the access token server-side via /api/spotify/sdk-token instead of
    // relying on `session.provider_token`.
    try {
      const res = await fetch("/api/spotify/sdk-token", { cache: "no-store" });
      if (!res.ok) return null;
      const data = (await res.json()) as { accessToken?: string };
      return data.accessToken ?? null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const token = await getProviderToken();
      if (!token) {
        setReady(true); // ready, but no Spotify identity → provider stays idle
        return;
      }

      await loadSdk();
      if (cancelled) return;

      const spotifyCtor = window.Spotify;
      if (!spotifyCtor) throw new Error("Spotify SDK did not initialize.");

      const player = new spotifyCtor.Player({
        name: "WolfTune Web Player",
        volume: 0.7,
        getOAuthToken: (cb) => {
          getProviderToken().then((tok) => {
            if (tok) cb(tok);
          });
        },
      });

      player.addListener("ready", ({ device_id }: { device_id: string }) => {
        if (!cancelled) {
          setDeviceId(device_id);
          setReady(true);
        }
      });
      player.addListener("not_ready", () => {
        if (!cancelled) setDeviceId(null);
      });
      player.addListener("initialization_error", ({ message }) =>
        console.error("Spotify SDK init error:", message)
      );
      player.addListener("authentication_error", ({ message }) =>
        console.error("Spotify SDK auth error:", message)
      );
      player.addListener("account_error", ({ message }) =>
        console.error("Spotify SDK account error (Premium required):", message)
      );

      playerRef.current = player;
      await player.connect();
    }

    init().catch((err) => console.error(err));

    return () => {
      cancelled = true;
      playerRef.current?.disconnect();
      playerRef.current = null;
    };
  }, [getProviderToken]);

  /** Pauses playback, tolerating failures (e.g. device already idle). */
  const stopInternal = useCallback(async () => {
    try {
      await playerRef.current?.pause();
    } catch {
      /* device may already be idle */
    }
  }, []);

  const playSnippet = useCallback(
    async (uri: string, offsetMs = 0, durationMs?: number) => {
      // The Web Playback SDK's pause/resume/seek can only control ALREADY
      // loaded playback — they cannot start a track. Starting playback of a
      // specific URI requires the Web API PUT /me/player/play with the
      // device_id of this browser tab's player.
      const token = await getProviderToken();
      if (!token) throw new Error("Spotify is not connected.");
      if (!deviceId) throw new Error("Spotify player device is not ready yet.");

      if (snippetTimeoutRef.current) {
        clearTimeout(snippetTimeoutRef.current);
        snippetTimeoutRef.current = null;
      }

      const maxOffset = durationMs !== undefined ? Math.max(durationMs - 1000, 0) : 0;
      const clampedOffset = Math.max(0, Math.min(offsetMs, maxOffset));
      const res = await fetch(
        `https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ uris: [uri], position_ms: clampedOffset }),
        }
      );
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Spotify playback failed (${res.status}): ${body.slice(0, 200)}`);
      }

      setPlayingUri(uri);
      // Without durationMs the track plays in full — no auto-pause timer.
      if (durationMs !== undefined) {
        const snippetMs = Math.min(SNIPPET_MAX_MS, Math.max(durationMs - clampedOffset, 1000));
        snippetTimeoutRef.current = setTimeout(() => {
          snippetTimeoutRef.current = null;
          void stopInternal();
          setPlayingUri(null);
        }, snippetMs);
      }
    },
    [deviceId, getProviderToken, stopInternal]
  );

  const stop = useCallback(async () => {
    if (snippetTimeoutRef.current) clearTimeout(snippetTimeoutRef.current);
    await stopInternal();
    setPlayingUri(null);
  }, [stopInternal]);

  const pause = useCallback(async () => {
    await stopInternal();
  }, [stopInternal]);

  const resume = useCallback(async () => {
    try {
      await playerRef.current?.resume();
    } catch {
      /* nothing to resume */
    }
  }, []);

  const value = useMemo(
    () => ({ deviceId, ready, playingUri, playSnippet, stop, pause, resume }),
    [deviceId, ready, playingUri, playSnippet, stop, pause, resume]
  );

  return <SpotifyPlayerContext.Provider value={value}>{children}</SpotifyPlayerContext.Provider>;
}

export function useSpotifyPlayer(): SpotifyPlayerContextValue {
  const ctx = useContext(SpotifyPlayerContext);
  if (!ctx) throw new Error("useSpotifyPlayer must be used inside <SpotifyPlayerProvider>.");
  return ctx;
}
