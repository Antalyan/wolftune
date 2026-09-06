import type { SpotifyTrack } from "@/types/spotify";

/**
 * Levenshtein distance between two strings.
 * Returns the number of single-character edits needed to transform one string into another.
 */
export function levenshtein(a: string, b: string): number {
  const aLen = a.length;
  const bLen = b.length;

  if (aLen === 0) return bLen;
  if (bLen === 0) return aLen;

  // Use two rows instead of full matrix for memory efficiency
  let prevRow = Array.from({ length: bLen + 1 }, (_, i) => i);
  let currRow = new Array(bLen + 1);

  for (let i = 1; i <= aLen; i++) {
    currRow[0] = i;
    for (let j = 1; j <= bLen; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        currRow[j - 1] + 1,      // insertion
        prevRow[j] + 1,          // deletion
        prevRow[j - 1] + cost    // substitution
      );
    }
    [prevRow, currRow] = [currRow, prevRow];
  }

  return prevRow[bLen];
}

/**
 * Normalize a string for fuzzy comparison: lowercase, trim, collapse whitespace.
 */
function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Fuzzy match two strings.
 * Returns true if they are "close enough" to be considered a match.
 * Uses a tolerance based on string length (roughly 30% of the longer string, min 2).
 */
export function fuzzyMatch(input: string, target: string): boolean {
  const a = normalize(input);
  const b = normalize(target);

  if (a === b) return true;
  if (a.length === 0 || b.length === 0) return false;

  const maxLen = Math.max(a.length, b.length);
  const tolerance = Math.max(2, Math.floor(maxLen * 0.3));
  return levenshtein(a, b) <= tolerance;
}

/**
 * Artist matching for the guessing game.
 * The guess is correct if it matches ANY of the track's artists (full name),
 * OR a single name token of any artist — so a surname alone ("Dvořák") or a
 * first name alone ("Antonín") counts for "Antonín Dvořák".
 */
export function matchesArtist(input: string, artists: SpotifyTrack["artists"]): boolean {
  const a = normalize(input);
  if (a.length === 0) return false;

  for (const artist of artists) {
    const full = normalize(artist.name);
    if (full.length === 0) continue;

    // Full artist name match (fuzzy).
    if (fuzzyMatch(a, full)) return true;

    // Single-token match: surname ("Dvořák") or first name ("Antonín").
    const tokens = full.split(" ").filter((t) => t.length >= 3);
    for (const token of tokens) {
      if (fuzzyMatch(a, token)) return true;
    }
  }
  return false;
}

/**
 * Weighted random selection.
 * Higher difficulty = higher chance of being selected.
 * Returns the selected track and its index in the pool.
 */
export function weightedPick<T extends { difficulty: number }>(items: T[]): { item: T; index: number } {
  if (items.length === 0) throw new Error("Cannot pick from empty pool");

  const totalWeight = items.reduce((sum, item) => sum + item.difficulty, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < items.length; i++) {
    random -= items[i].difficulty;
    if (random <= 0) return { item: items[i], index: i };
  }

  // Fallback (shouldn't reach here due to floating point)
  return { item: items[items.length - 1], index: items.length - 1 };
}

/**
 * Evaluate a round result and compute the new difficulty.
 *
 * Outcomes:
 * - Both correct: difficulty → 1 (or -1 if currently > 2)
 * - One correct: difficulty - 1 (floor at 1), or stays at 2 if coming from 2
 * - Both wrong: difficulty + 1
 */
export function evaluateRound(
  currentDifficulty: number,
  songCorrect: boolean,
  artistCorrect: boolean
): { newDifficulty: number; outcome: "both_correct" | "one_correct" | "both_wrong" } {
  const bothCorrect = songCorrect && artistCorrect;
  const bothWrong = !songCorrect && !artistCorrect;

  let newDifficulty: number;
  let outcome: "both_correct" | "one_correct" | "both_wrong";

  if (bothCorrect) {
    outcome = "both_correct";
    newDifficulty = currentDifficulty > 2 ? currentDifficulty - 1 : 1;
  } else if (bothWrong) {
    outcome = "both_wrong";
    newDifficulty = currentDifficulty + 1;
  } else {
    outcome = "one_correct";
    newDifficulty = currentDifficulty > 2 ? currentDifficulty - 1 : currentDifficulty;
  }

  return { newDifficulty, outcome };
}

/** A track with its difficulty for the weighted picker */
export interface TrackWithDifficulty {
  track: SpotifyTrack;
  difficulty: number;
}

/** Session statistics for the current game */
export interface SessionStats {
  totalRounds: number;
  correctRounds: number;
  authorCorrect: number;
  songCorrect: number;
  byAuthor: Record<string, { correct: number; incorrect: number }>;
  bySong: Record<string, { correct: number; incorrect: number }>;
}

export function createEmptySessionStats(): SessionStats {
  return {
    totalRounds: 0,
    correctRounds: 0,
    authorCorrect: 0,
    songCorrect: 0,
    byAuthor: {},
    bySong: {},
  };
}

export function recordRound(
  stats: SessionStats,
  track: SpotifyTrack,
  songCorrect: boolean,
  artistCorrect: boolean
): SessionStats {
  const artistName = track.artists[0]?.name ?? "Unknown";
  const songName = track.name;

  const byAuthor = { ...stats.byAuthor };
  const bySong = { ...stats.bySong };

  if (!byAuthor[artistName]) byAuthor[artistName] = { correct: 0, incorrect: 0 };
  if (!bySong[songName]) bySong[songName] = { correct: 0, incorrect: 0 };

  if (artistCorrect) byAuthor[artistName].correct++;
  else byAuthor[artistName].incorrect++;

  if (songCorrect) bySong[songName].correct++;
  else bySong[songName].incorrect++;

  return {
    totalRounds: stats.totalRounds + 1,
    correctRounds: stats.correctRounds + (songCorrect && artistCorrect ? 1 : 0),
    authorCorrect: stats.authorCorrect + (artistCorrect ? 1 : 0),
    songCorrect: stats.songCorrect + (songCorrect ? 1 : 0),
    byAuthor,
    bySong,
  };
}
