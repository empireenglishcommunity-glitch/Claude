import { MaterialCommunityIcons } from '@expo/vector-icons';

export type Rank = {
  id: string;
  title: string;
  titleAr: string;
  minXp: number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

/**
 * The four imperial ranks the user climbs through XP.
 * Citizen → Knight → Commander → Emperor.
 */
export const RANKS: Rank[] = [
  { id: 'citizen', title: 'Citizen', titleAr: 'مواطن', minXp: 0, icon: 'account' },
  { id: 'knight', title: 'Knight', titleAr: 'فارس', minXp: 150, icon: 'shield-sword' },
  { id: 'commander', title: 'Commander', titleAr: 'قائد', minXp: 450, icon: 'chess-rook' },
  { id: 'emperor', title: 'Emperor', titleAr: 'إمبراطور', minXp: 1000, icon: 'crown' },
];

export type RankProgress = {
  current: Rank;
  next: Rank | null;
  /** 0..1 progress toward the next rank. */
  ratio: number;
  xpIntoRank: number;
  xpForNext: number | null;
};

export function getRankProgress(xp: number): RankProgress {
  let current = RANKS[0];
  let next: Rank | null = null;
  for (let i = 0; i < RANKS.length; i++) {
    if (xp >= RANKS[i].minXp) {
      current = RANKS[i];
      next = RANKS[i + 1] ?? null;
    }
  }
  if (!next) {
    return { current, next: null, ratio: 1, xpIntoRank: xp - current.minXp, xpForNext: null };
  }
  const span = next.minXp - current.minXp;
  const into = xp - current.minXp;
  return {
    current,
    next,
    ratio: Math.max(0, Math.min(1, into / span)),
    xpIntoRank: into,
    xpForNext: next.minXp - xp,
  };
}

/** XP awards for different actions across the Empire. */
export const XP = {
  discoverWord: 5, // first time you open a word
  pronounce: 1, // tapping the speaker
  completeLesson: 20, // finishing a "Learn this word" session
  dailyVisit: 10, // first activity of the day
} as const;
