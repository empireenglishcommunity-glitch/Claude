import AsyncStorage from '@react-native-async-storage/async-storage';

/** Persistent shape of the user's imperial journey. */
export type ProgressState = {
  xp: number;
  viewedWords: string[]; // words opened at least once
  learnedWords: string[]; // words completed via a Learn session
  streak: number; // consecutive active days
  lastActiveDate: string | null; // YYYY-MM-DD
  totalDays: number; // distinct active days ever
};

export const INITIAL_PROGRESS: ProgressState = {
  xp: 0,
  viewedWords: [],
  learnedWords: [],
  streak: 0,
  lastActiveDate: null,
  totalDays: 0,
};

const KEY = 'empire.progress.v1';

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}

export async function loadProgress(): Promise<ProgressState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...INITIAL_PROGRESS };
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    return { ...INITIAL_PROGRESS, ...parsed };
  } catch {
    return { ...INITIAL_PROGRESS };
  }
}

export async function saveProgress(state: ProgressState): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // best-effort
  }
}

/**
 * Update the daily streak based on today's date.
 * Returns the (possibly) updated state and whether today is a *new* active day.
 */
export function applyDailyVisit(state: ProgressState): { state: ProgressState; isNewDay: boolean } {
  const today = todayKey();
  if (state.lastActiveDate === today) {
    return { state, isNewDay: false };
  }
  let streak = 1;
  if (state.lastActiveDate) {
    const gap = daysBetween(state.lastActiveDate, today);
    streak = gap === 1 ? state.streak + 1 : 1;
  }
  return {
    state: {
      ...state,
      streak,
      lastActiveDate: today,
      totalDays: state.totalDays + 1,
    },
    isNewDay: true,
  };
}
