"use client";

import {useCallback, useEffect, useRef, useState} from "react";
import Link from "next/link";
import {useFormState} from "react-dom";
import {
    addPlanEntry,
    updatePlanEntry,
    deletePlanEntry,
    type PlanActionResult,
} from "@/app/groups/actions";
import {
    CalendarCheck,
    Disc3,
    ListMusic,
    Pencil,
    PlusCircle,
    Trash2,
    UserCircle,
    CheckCircle2,
    Clock,
} from "lucide-react";
import type {RatingPlanEntry} from "@/lib/rating-plans";

interface MemberOption {
    id: string;
    username: string;
}

interface Props {
    groupId: string;
    plans: RatingPlanEntry[];
    members: MemberOption[];
}

function fmtDate(iso: string): string {
    // iso is yyyy-mm-dd from <input type="date">
    const d = new Date(iso + "T00:00:00");
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
    });
}

function isPast(iso: string): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(iso + "T00:00:00");
    return d < today;
}

export function RatingPlanPanel({groupId, plans, members}: Props) {
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    return (
        <div className="bg-night-800/60 border border-night-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-wolf-400"/>
                    Rating plan ({plans.length})
                </h2>
                <button
                    type="button"
                    onClick={() => {
                        setEditingId(null);
                        setShowForm((s) => !s);
                    }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-wolf-300 hover:text-white transition-colors"
                >
                    <PlusCircle className="w-3.5 h-3.5"/>
                    {showForm && !editingId ? "Close" : "Add entry"}
                </button>
            </div>

            {showForm && !editingId && (
                <PlanForm
                    groupId={groupId}
                    members={members}
                    mode="add"
                    onDone={() => setShowForm(false)}
                />
            )}

            {plans.length === 0 && !showForm ? (
                <p className="text-xs text-zinc-500">
                    No plans yet. Add an entry to schedule what the group rates next.
                </p>
            ) : (
                <div className="space-y-2">
                    {plans.map((plan) => (
                        <div key={plan.id}>
                            {editingId === plan.id ? (
                                <PlanForm
                                    groupId={groupId}
                                    members={members}
                                    mode="edit"
                                    initial={plan}
                                    onDone={() => setEditingId(null)}
                                />
                            ) : (
                                <PlanRow
                                    plan={plan}
                                    onEdit={() => {
                                        setEditingId(plan.id);
                                        setShowForm(true);
                                    }}
                                />
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function PlanRow({plan, onEdit}: { plan: RatingPlanEntry; onEdit: () => void }) {
    const [state, action, pending] = useFormState(deletePlanEntry, {
        error: null,
        success: null,
    } as PlanActionResult);
    const past = isPast(plan.scheduledDate);
    const TargetIcon = plan.target.kind === "album" ? Disc3 : ListMusic;

    return (
        <div
            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                plan.done
                    ? "bg-emerald-950/20 border-emerald-900/40"
                    : past
                        ? "bg-night-900/60 border-night-700 opacity-70"
                        : "bg-night-900/40 border-night-700"
            }`}
        >
            <div
                className="w-9 h-9 rounded-lg bg-night-800 border border-night-700 overflow-hidden shrink-0 flex items-center justify-center">
                {plan.target.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={plan.target.coverUrl} alt="" className="w-full h-full object-cover"/>
                ) : (
                    <TargetIcon className="w-4 h-4 text-zinc-600"/>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <Link
                        href={
                            plan.target.kind === "album"
                                ? `/albums/${plan.target.spotifyId}`
                                : `/playlists/${plan.target.spotifyId}`
                        }
                        className="text-sm text-white truncate hover:text-blue-300 hover:underline underline-offset-2 transition-colors"
                        title={plan.target.kind === "album" ? "View album" : "View playlist"}
                    >
                        {plan.target.name}
                    </Link>
                    {plan.done ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0"/>
                    ) : past ? (
                        <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0"/>
                    ) : null}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                    <span className="truncate">{plan.target.subtitle}</span>
                    <span className="text-zinc-600">·</span>
                    <span className="flex items-center gap-1 min-w-0">
            <UserCircle className="w-3 h-3 shrink-0"/>
                        <span className="truncate">{plan.assignedMember.username}</span>
          </span>
                    <span className="text-zinc-600">·</span>
                    <span>{fmtDate(plan.scheduledDate)}</span>
                </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
                <button
                    type="button"
                    onClick={onEdit}
                    className="p-1 text-zinc-500 hover:text-white transition-colors"
                    aria-label="Edit plan entry"
                    title="Edit"
                >
                    <Pencil className="w-3.5 h-3.5"/>
                </button>
                <form action={action}>
                    <input type="hidden" name="plan_id" value={plan.id}/>
                    <input type="hidden" name="group_id" value={plan.groupId}/>
                    <button
                        type="submit"
                        disabled={pending}
                        className="p-1 text-zinc-500 hover:text-red-300 transition-colors disabled:opacity-50"
                        aria-label="Delete plan entry"
                        title="Delete"
                    >
                        <Trash2 className="w-3.5 h-3.5"/>
                    </button>
                </form>
            </div>
            {state?.error && <p className="text-[10px] text-red-300 mt-1">{state.error}</p>}
        </div>
    );
}

interface FormProps {
    groupId: string;
    members: MemberOption[];
    mode: "add" | "edit";
    initial?: RatingPlanEntry;
    onDone: () => void;
}

function PlanForm({groupId, members, mode, initial, onDone}: FormProps) {
    const action = mode === "add" ? addPlanEntry : updatePlanEntry;
    const [state, formAction, pending] = useFormState(action, {
        error: null,
        success: null,
    } as PlanActionResult);

    const [targetKind, setTargetKind] = useState<"album" | "playlist">(
        initial?.target.kind ?? "album"
    );

    return (
        <form
            action={formAction}
            className="bg-night-900/60 border border-night-700 rounded-lg p-3 space-y-3 mb-3"
        >
            <input type="hidden" name="group_id" value={groupId}/>
            {mode === "edit" && <input type="hidden" name="plan_id" value={initial?.id}/>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">Date</label>
                    <input
                        type="date"
                        name="scheduled_date"
                        required
                        disabled={pending}
                        defaultValue={initial?.scheduledDate ?? ""}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-night-800 border border-night-700 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                        Assigned to
                    </label>
                    <select
                        name="assigned_member_id"
                        required
                        disabled={pending}
                        defaultValue={initial?.assignedMember.userId ?? members[0]?.id ?? ""}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-night-800 border border-night-700 text-white text-sm focus:outline-none focus:border-blue-500"
                    >
                        {members.map((m) => (
                            <option key={m.id} value={m.id}>
                                {m.username}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Target type</label>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setTargetKind("album")}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                            targetKind === "album"
                                ? "border-blue-500/50 bg-blue-600/10 text-blue-300"
                                : "border-night-700 text-zinc-400 hover:bg-night-800"
                        }`}
                    >
                        <Disc3 className="w-3.5 h-3.5"/> Album
                    </button>
                    <button
                        type="button"
                        onClick={() => setTargetKind("playlist")}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                            targetKind === "playlist"
                                ? "border-blue-500/50 bg-blue-600/10 text-blue-300"
                                : "border-night-700 text-zinc-400 hover:bg-night-800"
                        }`}
                    >
                        <ListMusic className="w-3.5 h-3.5"/> Playlist
                    </button>
                </div>
            </div>

            <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    {targetKind === "album" ? "Choose an album" : "Choose a playlist"}
                </label>
                <div key={targetKind}>
                    <TargetSearchPicker
                        kind={targetKind}
                        initial={
                            initial?.target.kind === targetKind
                                ? {id: initial.target.spotifyId, name: initial.target.name, sub: initial.target.subtitle}
                                : null
                        }
                        pending={pending}
                    />
                </div>
            </div>

            {state?.error && (
                <p className="text-xs text-red-300 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">
                    {state.error}
                </p>
            )}
            {state?.success && (
                <p className="text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-900/50 rounded-lg px-3 py-2">
                    {state.success}
                </p>
            )}

            <div className="flex gap-2">
                <button
                    type="submit"
                    disabled={pending}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-spotify-green hover:bg-spotify-bright text-night-950 font-bold text-xs transition-colors disabled:opacity-60"
                >
                    {pending ? "Saving…" : mode === "add" ? "Add to plan" : "Save changes"}
                </button>
                <button
                    type="button"
                    onClick={onDone}
                    className="flex-1 py-2 rounded-lg border border-night-700 text-zinc-400 text-xs font-semibold hover:bg-night-800 transition-colors"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}

interface PickedTarget {
    id: string;
    name: string;
    sub: string;
}

interface SearchResultItem {
    id: string;
    name: string;
    sub: string;
    coverUrl: string | null;
}

interface TargetSearchPickerProps {
    kind: "album" | "playlist";
    initial: PickedTarget | null;
    pending: boolean;
}

function TargetSearchPicker({kind, initial, pending}: TargetSearchPickerProps) {
    const fieldName = kind === "album" ? "album_spotify_id" : "playlist_spotify_id";
    const [chosen, setChosen] = useState<PickedTarget | null>(initial);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResultItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [manual, setManual] = useState("");
    const abortRef = useRef<AbortController | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const runSearch = useCallback(async (q: string) => {
        const trimmed = q.trim();
        if (!trimmed) {
            setResults([]);
            setSearched(false);
            return;
        }
        abortRef.current?.abort();
        abortRef.current = new AbortController();
        setLoading(true);
        setSearched(true);
        try {
            const params = new URLSearchParams({q: trimmed, types: kind});
            const res = await fetch(`/api/search?${params.toString()}`, {
                signal: abortRef.current.signal,
                cache: "no-store",
            });
            if (!res.ok) {
                const body = (await res.json().catch(() => null)) as { error?: string } | null;
                throw new Error(body?.error ?? "Search failed.");
            }
            const data = await res.json();
            const items = (kind === "album" ? data.albums ?? [] : data.playlists ?? []) as Array<{
                id: string;
                name: string;
                artist_name?: string;
                owner_name?: string;
                images?: Array<{url?: string}> | null;
            }>;
            setResults(
                items.map((item) => ({
                    id: item.id,
                    name: item.name,
                    sub: kind === "album" ? item.artist_name ?? "" : item.owner_name ?? "",
                    coverUrl: item.images?.[0]?.url ?? null,
                }))
            );
        } catch (err: unknown) {
            if (err instanceof DOMException && err.name === "AbortError") return;
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, [kind]);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => runSearch(query), 400);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query, runSearch]);

    const reset = () => {
        setChosen(null);
        setQuery("");
        setResults([]);
        setSearched(false);
        setManual("");
    };

    if (chosen) {
        return (
            <div className="space-y-2">
                <input type="hidden" name={fieldName} value={chosen.id}/>
                <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 border border-blue-500/30 px-2.5 py-2">
                    <span className="text-xs text-white font-medium truncate">{chosen.name}</span>
                    <span className="text-[11px] text-zinc-400 truncate">{chosen.sub}</span>
                    <button
                        type="button"
                        disabled={pending}
                        onClick={reset}
                        className="ml-auto shrink-0 text-[11px] text-blue-300 hover:text-white disabled:opacity-50"
                    >
                        Change
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <input type="hidden" name={fieldName} value=""/>
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={pending}
                placeholder={`Search ${kind}s…`}
                className="w-full px-2.5 py-1.5 rounded-lg bg-night-800 border border-night-700 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-blue-500"
            />

            {loading && <p className="text-[11px] text-zinc-500">Searching…</p>}

            {!loading && searched && results.length === 0 && (
                <p className="text-[11px] text-zinc-500">No results. Paste a Spotify link below instead.</p>
            )}

            {results.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                    {results.map((r) => (
                        <button
                            key={r.id}
                            type="button"
                            disabled={pending}
                            onClick={() => setChosen({id: r.id, name: r.name, sub: r.sub})}
                            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-night-800/60 border border-night-700 hover:border-blue-500/50 transition-colors text-left"
                        >
                            {r.coverUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={r.coverUrl} alt="" className="w-7 h-7 rounded object-cover bg-night-900 shrink-0"/>
                            ) : (
                                <div className="w-7 h-7 rounded bg-night-900 shrink-0"/>
                            )}
                            <span className="min-w-0">
                                <span className="block text-xs text-white truncate">{r.name}</span>
                                <span className="block text-[10px] text-zinc-400 truncate">{r.sub}</span>
                            </span>
                        </button>
                    ))}
                </div>
            )}

            <div className="flex gap-2 items-center">
                <input
                    type="text"
                    value={manual}
                    onChange={(e) => setManual(e.target.value)}
                    disabled={pending}
                    placeholder="…or paste a Spotify link / ID"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-night-800 border border-night-700 text-white placeholder-zinc-500 text-sm font-mono focus:outline-none focus:border-blue-500"
                />
                <button
                    type="button"
                    disabled={pending || !manual.trim()}
                    onClick={() => setChosen({id: manual.trim(), name: "Custom link", sub: kind})}
                    className="shrink-0 px-3 py-1.5 rounded-lg border border-night-700 text-zinc-300 text-xs font-semibold hover:bg-night-800 disabled:opacity-50 transition-colors"
                >
                    Use
                </button>
            </div>
        </div>
    );
}
