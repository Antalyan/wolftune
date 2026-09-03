import Link from "next/link";
import { Star, MessageSquare, Clock } from "lucide-react";

const mockReviews = [
  {
    user: "WolfMystic",
    avatar: "https://i.pravatar.cc/150?img=13",
    track: "Blinding Lights - The Weeknd",
    cover: "https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36",
    score: 9.5,
    text: "The synthwave-influenced production is absolutely hypnotic. A modern pop masterpiece that never gets old on repeat.",
    time: "2 hours ago",
    likes: 128,
  },
  {
    user: "MoonHowl",
    avatar: "https://i.pravatar.cc/150?img=5",
    track: "Midnight City - M83",
    cover: "https://i.scdn.co/image/ab67616d0000b27396c0926c48fb07d1302c3be9",
    score: 9.8,
    text: "That saxophone solo at the end is pure cinematic bliss. An undeniable modern electronic classic.",
    time: "5 hours ago",
    likes: 94,
  },
  {
    user: "NeonPaws",
    avatar: "https://i.pravatar.cc/150?img=32",
    track: "As It Was - Harry Styles",
    cover: "https://i.scdn.co/image/ab67616d0000b2732e8f6371050e04e76ea0dd79",
    score: 8.5,
    text: "Smooth, dreamy, and emotionally resonant. The synth-pop palette is incredibly polished.",
    time: "1 day ago",
    likes: 57,
  },
];

export default function ReviewsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-blue-500" /> Community Reviews
        </h1>
        <p className="text-xs text-zinc-400">What the wolfpack is saying about the tracks they love.</p>
      </div>

      <div className="space-y-4">
        {mockReviews.map((review, i) => (
          <div key={i} className="bg-night-800/80 border border-night-700 rounded-2xl p-4 hover:border-blue-700/50 transition-colors">
            <div className="flex gap-3">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={review.cover} alt={review.track} className="w-full h-full object-cover" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={review.avatar} alt={review.user} className="w-5 h-5 rounded-full border border-night-700" />
                  <span className="text-xs font-bold text-blue-400">{review.user}</span>
                  <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {review.time}
                  </span>
                  <span className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded bg-spotify-green/10 border border-spotify-green/30 text-[11px] font-bold text-spotify-bright">
                    <Star className="w-3 h-3 fill-current" /> {review.score}
                  </span>
                </div>

                <h3 className="text-sm font-bold truncate text-white">{review.track}</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  &ldquo;{review.text}&rdquo;
                </p>

                <div className="flex items-center gap-4 mt-2 text-[11px] text-zinc-500">
                  <span className="flex items-center gap-1">❤️ {review.likes} likes</span>
                  <span className="flex items-center gap-1">💬 Reply</span>
                  <Link href="/search" className="text-blue-400 hover:text-blue-300">· Discover similar tracks</Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}