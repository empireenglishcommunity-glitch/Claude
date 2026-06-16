import { MaterialCommunityIcons } from '@expo/vector-icons';

export type Province = {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  /** Words (lowercased) that belong to this province. */
  words: string[];
  /** Provinces unlock in order; this one unlocks when the previous is cleared. */
  order: number;
};

/**
 * The Conquest Map: themed regions of the Empire.
 * Each province is a small, masterable collection of words — clearing it
 * (mastering all its words) unlocks the next, giving a story-driven path.
 */
export const PROVINCES: Province[] = [
  {
    id: 'court',
    name: 'The Royal Court',
    nameAr: 'البلاط الملكي',
    description: 'Words of power, leadership, and glory.',
    icon: 'crown',
    order: 0,
    words: ['empire', 'leader', 'community', 'victory', 'courage', 'wisdom'],
  },
  {
    id: 'library',
    name: "The Scholar's Library",
    nameAr: 'مكتبة العلماء',
    description: 'The vocabulary of knowledge and thought.',
    icon: 'bookshelf',
    order: 1,
    words: ['knowledge', 'language', 'vocabulary', 'idea', 'thought', 'develop'],
  },
  {
    id: 'hall',
    name: "The Speaker's Hall",
    nameAr: 'قاعة الخطباء',
    description: 'Master pronunciation and the spoken word.',
    icon: 'microphone-variant',
    order: 2,
    words: ['pronunciation', 'accent', 'practice', 'improve', 'letter', 'often'],
  },
  {
    id: 'road',
    name: "The Traveler's Road",
    nameAr: 'طريق المسافر',
    description: 'Words for journeys, people, and the world.',
    icon: 'map-marker-path',
    order: 3,
    words: ['journey', 'world', 'people', 'opportunity', 'success', 'water'],
  },
  {
    id: 'everyday',
    name: 'The Everyday Empire',
    nameAr: 'إمبراطورية الحياة اليومية',
    description: 'Common words that connect everything.',
    icon: 'home-city',
    order: 4,
    words: ['beautiful', 'comfortable', 'schedule', 'although', 'because', 'important'],
  },
];

export type ProvinceStatus = {
  province: Province;
  masteredCount: number;
  total: number;
  ratio: number;
  cleared: boolean;
  unlocked: boolean;
};

/** Compute per-province progress + unlock state from the user's mastered words. */
export function getProvinceStatuses(learnedWords: string[]): ProvinceStatus[] {
  const learned = new Set(learnedWords.map((w) => w.toLowerCase()));
  const ordered = [...PROVINCES].sort((a, b) => a.order - b.order);

  let previousCleared = true; // first province is always unlocked
  return ordered.map((province) => {
    const masteredCount = province.words.filter((w) => learned.has(w)).length;
    const total = province.words.length;
    const cleared = masteredCount === total && total > 0;
    const unlocked = previousCleared;
    previousCleared = cleared;
    return {
      province,
      masteredCount,
      total,
      ratio: total ? masteredCount / total : 0,
      cleared,
      unlocked,
    };
  });
}
