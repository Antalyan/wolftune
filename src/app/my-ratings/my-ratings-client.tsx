"use client";

import {useMemo, useState} from "react";
import Link from "next/link";
import {Search, Disc3, ListMusic, SlidersHorizontal} from "lucide-react";
import type {MyRating, MyRatingAlbum, MyRatingPlaylist} from "@/lib/my-ratings";

interface Props {
    albums: MyRatingAlbum[];
    playlists: MyRatingPlaylist[];
}

type KindFilter = "all" | "album" | "playlist";
type SortKey = "recent" | "name" | "score-high" | "score-low";

const PAGE_SIZE = 24;

function coverFallback(kind: "album" | "playlist") {
    return kind === "album" ? Disc3 : ListMusic;
}

function rateHref(item: MyRating) {
    return item.kind === "album" ? `/albums/${item.spotifyId}` : `/playlists/${item.spotifyId}`;
}

/** Best single score to show/sort by: subjective first, else track average. */
function primaryScore(item: MyRating): number | null {
    if (item.kind === "album") {
        return item.subjectiveScore ?? item.trackAvg ?? null;
    }
    return item.subjectiveScore ?? null;
}

export default function MyRatingsClient({albums, playlists}: Props) {
    const [query, setQuery] = useState("");
    const [kind, setKind] = useState<KindFilter>("all");
    const [sort, setSort] = useState<SortKey>("recent");
    const [page, setPage] = useState(0);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        let items: MyRating[] = [];
        if (kind === "all" || kind === "album") items = items.concat(albums);
        if (kind === "all" || kind === "playlist") items = items.concat(playlists);

        if (q) {
            items = items.filter((it) => {
                const hay =
                    it.kind === "album"
                        ? `${it.name} ${it.artistName}`.toLowerCase()
                        : `${it.name} ${it.ownerName}`.toLowerCase();
                return hay.includes(q);
            });
        }

        items = [...items].sort((a, b) => {
            switch (sort) {
                case "name":
                    return a.name.localeCompare(b.name);
                case "score-high":
                    return (primaryScore(b) ?? -1) - (primaryScore(a) ?? -1);
                case "score-low":
                    return (primaryScore(a) ?? 11) - (primaryScore(b) ?? 11);
                case "recent":
                default:
                    return (b.ratedAt ?? "").localeCompare(a.ratedAt ?? "");
            }
        });

        return items;
    }, [albums, playlists, query, kind, sort]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, pageCount - 1);
    const pageItems = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

    return (
        <div>
            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setPage(0);
                        }}
                        placeholder="Search by name or artist…"
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-night-800 border border-night-700 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-sm"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-zinc-500"/>
                    <select
                        value={kind}
                        onChange={(e) => {
                            setKind(e.target.value as KindFilter);
                            setPage(0);
                        }}
                        className="bg-night-800 border border-night-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                        <option value="all">All</option>
                        <option value="album">Albums</option>
                        <option value="playlist">Playlists</option>
                    </select>
                    <select
                        value={sort}
                        onChange={(e) => setSort(e.target.value as SortKey)}
                        className="bg-night-800 border border-night-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                        <option value="recent">Most recent</option>
                        <option value="name">Name A–Z</option>
                        <option value="score-high">Score: high to low</option>
                        <option value="score-low">Score: low to high</option>
                    </select>
                </div>
            </div>

            <p className="text-xs text-zinc-500 mb-4">
                {filtered.length} rated {filtered.length === 1 ? "item" : "items"}
                {kind !== "all" && ` · ${kind}s`}
                {query && ` · matching “${query}”`}
            </p>

            {/* Grid */}
            {pageItems.length === 0 ? (
                <p className="text-sm text-zinc-400 py-10 text-center">No ratings match your filters.</p>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {pageItems.map((item) => (
                        <RatingCard key={`${item.kind}-${item.spotifyId}`} item={item}/>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {pageCount > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                    <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={safePage === 0}
                        className="px-3 py-1.5 rounded-lg border border-night-700 text-sm text-zinc-300 disabled:opacity-40 hover:bg-night-800"
                    >
                        ← Prev
                    </button>
                    <span className="text-xs text-zinc-500">
            Page {safePage + 1} of {pageCount}
          </span>
                    <button
                        type="button"
                        onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                        disabled={safePage >= pageCount - 1}
                        className="px-3 py-1.5 rounded-lg border border-night-700 text-sm text-zinc-300 disabled:opacity-40 hover:bg-night-800"
                    >
                        Next →
                    </button>
                </div>
            )}
        </div>
    );
}

function RatingCard({item}: { item: MyRating }) {
    const Icon = coverFallback(item.kind);
    const score = primaryScore(item);
    const isAlbum = item.kind === "album";
    const subtitle = isAlbum
        ? (item as MyRatingAlbum).artistName
        : (item as MyRatingPlaylist).ownerName;

    return (
        <Link
            href={rateHref(item)}
            className="group block bg-night-800/60 border border-night-700 rounded-xl overflow-hidden hover:border-blue-500/40 transition-colors"
        >
            <div className="aspect-square bg-night-900 relative overflow-hidden">
                {item.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={item.coverUrl}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Icon className="w-10 h-10 text-zinc-700"/>
                    </div>
                )}
                <span
                    className="absolute top-1.5 left-1.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-night-950/70 text-zinc-300">
          {isAlbum ? "Album" : "Playlist"}
        </span>
                {score !== null && (
                    <span
                        className="absolute bottom-1.5 right-1.5 text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-spotify-green/90 text-night-950 font-mono">
            {score.toFixed(1)}
          </span>
                )}
            </div>
            <div className="p-2.5">
                <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                <p className="text-[11px] text-zinc-400 truncate">{subtitle}</p>
                {isAlbum && (item as MyRatingAlbum).trackCount > 0 && (
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                        {(item as MyRatingAlbum).trackCount} track
                        {(item as MyRatingAlbum).trackCount === 1 ? "" : "s"} rated
                    </p>
                )}
            </div>
        </Link>
    );
}
