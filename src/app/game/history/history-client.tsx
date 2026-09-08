"use client";

import { useMemo, useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import type { GuessHistoryRow } from "./page";

const PAGE_SIZE = 25;

export function HistoryClient({ initial }: { initial: GuessHistoryRow[] }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initial;
    return initial.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.artist.toLowerCase().includes(q) ||
        r.trackId.toLowerCase().includes(q)
    );
  }, [initial, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const updateQuery = (v: string) => {
    setQuery(v);
    setPage(1);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={query}
          onChange={(e) => updateQuery(e.target.value)}
          placeholder="Search by track, artist or ID…"
          className="w-full pl-9 pr-3 py-2 rounded-xl bg-night-800 border border-night-700 text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-zinc-500 py-10">No matching entries.</p>
      ) : (
        <div className="space-y-2">
          {pageRows.map((row) => {
            const attempts = row.correct + row.incorrect;
            const acc = attempts > 0 ? (row.correct / attempts) * 100 : 0;
            return (
              <div
                key={row.trackId}
                className="flex items-center gap-3 p-3 rounded-xl bg-night-800/60 border border-night-700"
              >
                <div className="w-10 h-10 rounded-lg bg-night-900 border border-night-700 overflow-hidden shrink-0">
                  {row.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.coverUrl} alt="" className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{row.name}</p>
                  <p className="text-[11px] text-zinc-400 truncate">{row.artist || "Unknown artist"}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] text-zinc-400">
                    <span className="text-emerald-400">{row.correct}</span>
                    {" / "}
                    {attempts}
                  </p>
                  <p className="text-[10px] text-zinc-500 font-mono">{acc.toFixed(0)}%</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-night-700 text-zinc-300 text-xs font-semibold hover:bg-night-800 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Prev
          </button>
          <span className="text-[11px] text-zinc-500">
            Page {safePage} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-night-700 text-zinc-300 text-xs font-semibold hover:bg-night-800 disabled:opacity-40 transition-colors"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}