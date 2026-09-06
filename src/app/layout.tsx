import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SpotifyPlayerProvider } from "@/components/SpotifyPlayerProvider";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000"
  ),
  title: {
    default: "WolfTune - Music Rating & Guessing Game",
    template: "%s | WolfTune",
  },
  description:
    "Discover, rate and review tracks and albums. Challenge yourself with music guessing quizzes powered by Spotify.",
  applicationName: "WolfTune",
  keywords: [
    "music",
    "ratings",
    "spotify",
    "quiz",
    "guessing game",
  ],
  openGraph: {
    title: "WolfTune - Music Rating & Guessing Game",
    description:
      "Rate tracks, review albums, and guess songs. The music game for the pack.",
    siteName: "WolfTune",
    type: "website",
  },
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#070b15",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="bg-night text-zinc-100 flex flex-col min-h-screen antialiased selection:bg-blue-600/30 selection:text-blue-200">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-blue-600 focus:text-white focus:text-sm focus:font-semibold"
        >
          Skip to content
        </a>
        <SpotifyPlayerProvider>
          <Navbar />
          <main id="main" className="flex-1 flex flex-col">
            {children}
          </main>
          <Footer />
        </SpotifyPlayerProvider>
      </body>
    </html>
  );
}
