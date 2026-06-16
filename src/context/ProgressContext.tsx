import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  applyDailyVisit,
  INITIAL_PROGRESS,
  loadProgress,
  ProgressState,
  saveProgress,
} from '../services/progress';
import { getRankProgress, RankProgress, XP } from '../data/ranks';

export type XpEvent = { amount: number; reason: string; rankUp?: boolean };

type ProgressContextValue = {
  ready: boolean;
  state: ProgressState;
  rank: RankProgress;
  /** Latest XP gain, for showing a toast/animation. Cleared after consumption. */
  lastEvent: XpEvent | null;
  consumeEvent: () => void;
  registerActivity: () => void;
  discoverWord: (word: string) => void;
  completeLesson: (word: string) => void;
  addXp: (amount: number, reason: string) => void;
  reset: () => void;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ProgressState>(INITIAL_PROGRESS);
  const [ready, setReady] = useState(false);
  const [lastEvent, setLastEvent] = useState<XpEvent | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Hydrate from storage once.
  useEffect(() => {
    loadProgress().then((loaded) => {
      setState(loaded);
      setReady(true);
    });
  }, []);

  // Persist on every change (after hydration).
  useEffect(() => {
    if (ready) saveProgress(state);
  }, [state, ready]);

  const emitRankUp = useCallback((prevXp: number, nextXp: number, base: XpEvent) => {
    const before = getRankProgress(prevXp).current.id;
    const after = getRankProgress(nextXp).current.id;
    setLastEvent({ ...base, rankUp: before !== after });
  }, []);

  const addXp = useCallback(
    (amount: number, reason: string) => {
      setState((prev) => {
        const nextXp = prev.xp + amount;
        emitRankUp(prev.xp, nextXp, { amount, reason });
        return { ...prev, xp: nextXp };
      });
    },
    [emitRankUp],
  );

  const registerActivity = useCallback(() => {
    setState((prev) => {
      const { state: next, isNewDay } = applyDailyVisit(prev);
      if (!isNewDay) return prev;
      const withXp = { ...next, xp: next.xp + XP.dailyVisit };
      emitRankUp(prev.xp, withXp.xp, { amount: XP.dailyVisit, reason: 'Daily visit · زيارة يومية' });
      return withXp;
    });
  }, [emitRankUp]);

  const discoverWord = useCallback(
    (word: string) => {
      const w = word.trim().toLowerCase();
      if (!w) return;
      setState((prev) => {
        if (prev.viewedWords.includes(w)) return prev;
        const nextXp = prev.xp + XP.discoverWord;
        emitRankUp(prev.xp, nextXp, { amount: XP.discoverWord, reason: 'New word · كلمة جديدة' });
        return { ...prev, xp: nextXp, viewedWords: [w, ...prev.viewedWords] };
      });
    },
    [emitRankUp],
  );

  const completeLesson = useCallback(
    (word: string) => {
      const w = word.trim().toLowerCase();
      if (!w) return;
      setState((prev) => {
        if (prev.learnedWords.includes(w)) return prev;
        const nextXp = prev.xp + XP.completeLesson;
        emitRankUp(prev.xp, nextXp, { amount: XP.completeLesson, reason: 'Lesson mastered · أتقنت الكلمة' });
        return { ...prev, xp: nextXp, learnedWords: [w, ...prev.learnedWords] };
      });
    },
    [emitRankUp],
  );

  const reset = useCallback(() => setState({ ...INITIAL_PROGRESS }), []);
  const consumeEvent = useCallback(() => setLastEvent(null), []);

  const rank = useMemo(() => getRankProgress(state.xp), [state.xp]);

  const value = useMemo<ProgressContextValue>(
    () => ({
      ready,
      state,
      rank,
      lastEvent,
      consumeEvent,
      registerActivity,
      discoverWord,
      completeLesson,
      addXp,
      reset,
    }),
    [ready, state, rank, lastEvent, consumeEvent, registerActivity, discoverWord, completeLesson, addXp, reset],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used within a ProgressProvider');
  return ctx;
}
