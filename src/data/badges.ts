import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ProgressState } from '../services/progress';
import { getRankProgress } from './ranks';
import { getProvinceStatuses } from './provinces';

export type Badge = {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  /** Returns true when the badge is unlocked for the given progress. */
  earned: (s: ProgressState) => boolean;
};

export const BADGES: Badge[] = [
  {
    id: 'first-step',
    title: 'First Step',
    titleAr: 'أول خطوة',
    description: 'Discover your first word.',
    icon: 'foot-print',
    earned: (s) => s.viewedWords.length >= 1,
  },
  {
    id: 'explorer',
    title: 'Explorer',
    titleAr: 'مستكشف',
    description: 'Discover 10 words.',
    icon: 'compass',
    earned: (s) => s.viewedWords.length >= 10,
  },
  {
    id: 'first-mastery',
    title: 'First Mastery',
    titleAr: 'أول إتقان',
    description: 'Master a word in a lesson.',
    icon: 'check-decagram',
    earned: (s) => s.learnedWords.length >= 1,
  },
  {
    id: 'scholar',
    title: 'Scholar',
    titleAr: 'عالِم',
    description: 'Master 5 words.',
    icon: 'book-education',
    earned: (s) => s.learnedWords.length >= 5,
  },
  {
    id: 'flame-3',
    title: 'Kindled',
    titleAr: 'شعلة متّقدة',
    description: 'Reach a 3-day streak.',
    icon: 'fire',
    earned: (s) => s.streak >= 3,
  },
  {
    id: 'flame-7',
    title: 'Unbroken',
    titleAr: 'لا تنطفئ',
    description: 'Reach a 7-day streak.',
    icon: 'fire-circle',
    earned: (s) => s.streak >= 7,
  },
  {
    id: 'knight',
    title: 'Knighted',
    titleAr: 'فارس',
    description: 'Reach the rank of Knight.',
    icon: 'shield-sword',
    earned: (s) => getRankProgress(s.xp).current.id !== 'citizen',
  },
  {
    id: 'emperor',
    title: 'Emperor',
    titleAr: 'إمبراطور',
    description: 'Reach the highest rank.',
    icon: 'crown',
    earned: (s) => getRankProgress(s.xp).current.id === 'emperor',
  },
  {
    id: 'conqueror',
    title: 'Conqueror',
    titleAr: 'فاتح',
    description: 'Clear your first province.',
    icon: 'flag-variant',
    earned: (s) => getProvinceStatuses(s.learnedWords).some((p) => p.cleared),
  },
];

export function earnedBadges(s: ProgressState): Set<string> {
  return new Set(BADGES.filter((b) => b.earned(s)).map((b) => b.id));
}
