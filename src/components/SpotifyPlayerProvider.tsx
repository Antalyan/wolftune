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
import { createClient } from "@/lib/supabase/client";

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
   * Plays a snippet of a full track: seeks to `offsetMs`, plays for
   * `durationMs`, then pauses automatically. Requires Spotify Premium.
   */
  playSnippet: (uri: string, offsetMs: number, durationMs: number) => Promise<void>;
  stop: () => Promise<void>;
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
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.provider_token ?? null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const hasSpotify = session?.user.identities?.some((i) => i.provider === "spotify");
      if (!hasSpotify) {
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
          getProviderToken().then((token) => {
            if (token) cb(token);
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

  const playSnippet = useCallback(
    async (uri: string, offsetMs: number, durationMs: number) => {
      const player = playerRef.current;
      if (!player) throw new Error("Spotify player is not ready yet.");

      if (snippetTimeoutRef.current) clearTimeout(snippetTimeoutRef.current);
      await player.pause();

      // The Web Playback SDK authenticates internally via the getOAuthToken
      // callback — the user's OAuth token never appears in client code.
      const clampedOffset = Math.max(0, Math.min(offsetMs, Math.max(durationMs - SNIPPET_MAX_MS - 1000, 0)));
      await player.seek(clampedOffset);
      await player.resume();

      setPlayingUri(uri);
      const snippetMs = Math.min(SNIPPET_MAX_MS, Math.max(durationMs - clampedOffset, 1000));
      snippetTimeoutRef.current = setTimeout(() => {
        playerRef.current?.pause();
        setPlayingUri(null);
      }, snippetMs);
    },
    []
  );

  const stop = useCallback(async () => {
    if (snippetTimeoutRef.current) clearTimeout(snippetTimeoutRef.current);
    await playerRef.current?.pause();
    setPlayingUri(null);
  }, []);

  const value = useMemo(
    () => ({ deviceId, ready, playingUri, playSnippet, stop }),
    [deviceId, ready, playingUri, playSnippet, stop]
  );

  return <SpotifyPlayerContext.Provider value={value}>{children}</SpotifyPlayerContext.Provider>;
}

export function useSpotifyPlayer(): SpotifyPlayerContextValue {
  const ctx = useContext(SpotifyPlayerContext);
  if (!ctx) throw new Error("useSpotifyPlayer must be used inside <SpotifyPlayerProvider>.");
  return ctx;
}
