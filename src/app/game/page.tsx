"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getGamePool } from "@/lib/spotify";
import { SpotifyTrack } from "@/types/spotify";
import { WolfMascot } from "@/components/WolfMascot";
import { Headphones, RotateCcw, Award, Check, X, Flame } from "lucide-react";

export default function GamePage() {
  const [pool] = useState<SpotifyTrack[]>(() => getGamePool());
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [options, setOptions] = useState<SpotifyTrack[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [round, setRound] = useState(1);

  const startNewRound = useCallback(() => {
    audioRef.current?.pause();
    const correct = pool[Math.floor(Math.random() * pool.length)];
    const others = pool
      .filter((t) => t.id !== correct.id)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    const roundOptions = [correct, ...others].sort(() => 0.5 - Math.random());

    setCurrentTrack(correct);
    setOptions(roundOptions);
    setSelectedOptionId(null);
    setAnswered(false);

    if (correct.preview_url) {
      const newAudio = new Audio(correct.preview_url);
      newAudio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      audioRef.current = newAudio;
      newAudio.onended = () => setIsPlaying(false);
    }
  }, [pool]);

  useEffect(() => {
    startNewRound();
    return () => {
      audioRef.current?.pause();
    };
  }, [startNewRound, round]);

  const handleSelect = (option: SpotifyTrack) => {
    if (answered || !currentTrack) return;
    setAnswered(true);
    setSelectedOptionId(option.id);

    if (option.id === currentTrack.id) {
      setScore((s) => s + 100 + streak * 20);
      setStreak((st) => st + 1);
    } else {
      setStreak(0);
    }
  };

  const nextRound = () => {
    setRound((r) => r + 1);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 w-full flex flex-col items-center">
      {/* Header Stats */}
      <div className="w-full flex justify-between items-center bg-night-800 border border-night-700 rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-yellow-400" />
          <span className="text-xs text-zinc-400">Score:</span>
          <span className="text-base font-extrabold text-white">{score}</span>
        </div>
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500 animate-bounce" />
          <span className="text-xs text-zinc-400">Streak:</span>
          <span className="text-base font-extrabold text-emerald-400">{streak}x</span>
        </div>
        <div className="text-xs font-semibold text-zinc-400">Round {round}</div>
      </div>

      {/* Mascot Game Arena */}
      <div className="relative flex flex-col items-center bg-night-800/80 border border-night-700 rounded-3xl p-8 w-full mb-6">
        <div className="p-4 rounded-2xl bg-night-900 border border-blue-800/50 mb-4 shadow-xl shadow-blue-950/40">
          <WolfMascot size={90} mood={answered ? (selectedOptionId === currentTrack?.id ? "howling" : "cool") : "listening"} />
        </div>

        <h2 className="text-xl font-extrabold text-white mb-1">Guess The Mystery Song</h2>
        <p className="text-xs text-zinc-400 mb-6">Listen to the snippet and pick the correct track.</p>

        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600/10 border border-blue-500/30 text-blue-400 text-xs font-semibold mb-6">
          <Headphones className={`w-4 h-4 ${isPlaying ? "animate-pulse" : ""}`} />
          <span>{isPlaying ? "Audio Snippet Playing..." : "Ready to Play"}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
          {options.map((option) => {
            const isSelected = selectedOptionId === option.id;
            const isCorrect = option.id === currentTrack?.id;

            let btnStyle = "bg-night-900 border-night-700 hover:border-blue-700/50 text-zinc-200";
            if (answered) {
              if (isCorrect) btnStyle = "bg-emerald-950/80 border-emerald-500 text-emerald-300 font-bold";
              else if (isSelected) btnStyle = "bg-red-950/80 border-red-500 text-red-300";
              else btnStyle = "bg-night-900 opacity-40 border-night-800 text-zinc-500";
            }

            return (
              <button
                key={option.id}
                disabled={answered}
                onClick={() => handleSelect(option)}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all text-left ${btnStyle}`}
              >
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-bold truncate">{option.name}</div>
                  <div className="text-[11px] text-zinc-400 truncate">{option.artists[0]?.name}</div>
                </div>
                {answered && isCorrect && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                {answered && isSelected && !isCorrect && <X className="w-4 h-4 text-red-400 shrink-0" />}
              </button>
            );
          })}
        </div>

        {answered && (
          <button
            onClick={nextRound}
            className="mt-6 flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg transition-all"
          >
            Next Snippet <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}