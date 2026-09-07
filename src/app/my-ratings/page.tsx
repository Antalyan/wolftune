import {Suspense} from "react";
import {createClient} from "@/lib/supabase/server";
import {getMyRatings} from "@/lib/my-ratings";
import {WolfMascot} from "@/components/WolfMascot";
import {Star} from "lucide-react";
import MyRatingsClient from "./my-ratings-client";

export const dynamic = "force-dynamic";
export const metadata = {
    title: "My Ratings — WolfTune",
    description: "Browse every album and playlist you have rated.",
};

async function MyRatingsContent() {
    const supabase = createClient();
    const {
        data: {user},
    } = await supabase.auth.getUser();

    if (!user) {
        return (
            <div className="max-w-5xl mx-auto px-4 py-16 text-center">
                <WolfMascot size={80} mood="listening"/>
                <h2 className="mt-6 text-2xl font-bold text-white">Sign in to see your ratings</h2>
                <p className="mt-2 text-sm text-zinc-400">
                    Your rated albums and playlists will appear here.
                </p>
            </div>
        );
    }

    const data = await getMyRatings(supabase, user.id);
    const totalCount = data.albums.length + data.playlists.length;

    if (totalCount === 0) {
        return (
            <div className="max-w-5xl mx-auto px-4 py-16 text-center">
                <WolfMascot size={70} mood="howling"/>
                <h2 className="mt-6 text-2xl font-bold text-white">No ratings yet</h2>
                <p className="mt-2 text-sm text-zinc-400">
                    Rate an album or playlist from Search and it will show up here.
                </p>
            </div>
        );
    }

    return <MyRatingsClient albums={data.albums} playlists={data.playlists}/>;
}

export default function MyRatingsPage() {
    return (
        <div className="max-w-5xl mx-auto px-4 py-8 w-full">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Star className="w-6 h-6 text-amber-400"/> My Ratings
                </h1>
                <p className="text-xs text-zinc-400">
                    Every album and playlist you have rated. Search, sort and jump back to re-rate.
                </p>
            </div>
            <Suspense fallback={<p className="text-sm text-zinc-400">Loading your ratings…</p>}>
                <MyRatingsContent/>
            </Suspense>
        </div>
    );
}
