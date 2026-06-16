import {
  collection,
  doc,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export type LeaderboardEntry = {
  id: string;
  name: string;
  xp: number;
};

/** Push the signed-in user's latest score so they appear on the real leaderboard. */
export async function syncMyScore(uid: string, name: string, xp: number): Promise<void> {
  if (!db) return;
  try {
    await setDoc(
      doc(db, 'users', uid),
      { name: name.trim() || 'Citizen', xp, updatedAt: serverTimestamp() },
      { merge: true },
    );
  } catch {
    // best-effort; offline or rules issue shouldn't crash the UI
  }
}

/** Read the top players ordered by XP (real community ranking). */
export async function fetchTopUsers(max = 20): Promise<LeaderboardEntry[]> {
  if (!db) return [];
  try {
    const q = query(collection(db, 'users'), orderBy('xp', 'desc'), fbLimit(max));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data() as { name?: string; xp?: number };
      return { id: d.id, name: data.name || 'Citizen', xp: data.xp ?? 0 };
    });
  } catch {
    return [];
  }
}
