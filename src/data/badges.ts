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
    id: 'sage',
    title: 'Sage',
    titleAr: 'حكيم',
    description: 'Master 15 words.',
    icon: 'owl',
    earned: (s) => s.learnedWords.length >= 15,
  },
  {
    id: 'master-30',
    title: 'Grand Master',
    titleAr: 'أستاذ كبير',
    description: 'Master 30 words.',
    icon: 'school',
    earned: (s) => s.learnedWords.length >= 30,
  },
  {
    id: 'explorer-25',
    title: 'Pathfinder',
    titleAr: 'رائد',
    description: 'Discover 25 words.',
    icon: 'map-search',
    earned: (s) => s.viewedWords.length >= 25,
  },
  {
    id: 'explorer-50',
    title: 'Voyager',
    titleAr: 'مكتشف عظيم',
    description: 'Discover 50 words.',
    icon: 'compass-rose',
    earned: (s) => s.viewedWords.length >= 50,
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
    id: 'flame-30',
    title: 'Eternal Flame',
    titleAr: 'شعلة أبدية',
    description: 'Reach a 30-day streak.',
    icon: 'fire',
    earned: (s) => s.streak >= 30,
  },
  {
    id: 'xp-500',
    title: 'Rising Star',
    titleAr: 'نجم صاعد',
    description: 'Earn 500 XP.',
    icon: 'star-four-points',
    earned: (s) => s.xp >= 500,
  },
  {
    id: 'xp-1000',
    title: 'Legend',
    titleAr: 'أسطورة',
    description: 'Earn 1000 XP.',
    icon: 'star-circle',
    earned: (s) => s.xp >= 1000,
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
