import AsyncStorage from '@react-native-async-storage/async-storage';

/** Local, offline persistence for history & bookmarks (the Empire's archive). */

const HISTORY_KEY = 'empire.history';
const BOOKMARKS_KEY = 'empire.bookmarks';
const MAX_HISTORY = 50;

async function readList(key: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

async function writeList(key: string, list: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(list));
  } catch {
    // best-effort; ignore write failures
  }
}

export async function recordHistory(word: string): Promise<void> {
  const w = word.trim().toLowerCase();
  if (!w) return;
  const list = await readList(HISTORY_KEY);
  const next = [w, ...list.filter((x) => x !== w)].slice(0, MAX_HISTORY);
  await writeList(HISTORY_KEY, next);
}

export function getHistory(): Promise<string[]> {
  return readList(HISTORY_KEY);
}

export async function clearHistory(): Promise<void> {
  await writeList(HISTORY_KEY, []);
}

export function getBookmarks(): Promise<string[]> {
  return readList(BOOKMARKS_KEY);
}

export async function isBookmarked(word: string): Promise<boolean> {
  const list = await readList(BOOKMARKS_KEY);
  return list.includes(word.trim().toLowerCase());
}

export async function toggleBookmark(word: string): Promise<boolean> {
  const w = word.trim().toLowerCase();
  if (!w) return false;
  const list = await readList(BOOKMARKS_KEY);
  let next: string[];
  let added: boolean;
  if (list.includes(w)) {
    next = list.filter((x) => x !== w);
    added = false;
  } else {
    next = [w, ...list];
    added = true;
  }
  await writeList(BOOKMARKS_KEY, next);
  return added;
}


/* ----------------------------- Notes ----------------------------- */

const NOTES_KEY = 'empire.notes';

type NotesMap = Record<string, string>;

async function readNotes(): Promise<NotesMap> {
  try {
    const raw = await AsyncStorage.getItem(NOTES_KEY);
    return raw ? (JSON.parse(raw) as NotesMap) : {};
  } catch {
    return {};
  }
}

export async function getNote(word: string): Promise<string> {
  const notes = await readNotes();
  return notes[word.trim().toLowerCase()] ?? '';
}

export async function setNote(word: string, text: string): Promise<void> {
  const w = word.trim().toLowerCase();
  if (!w) return;
  const notes = await readNotes();
  if (text.trim()) {
    notes[w] = text;
  } else {
    delete notes[w];
  }
  try {
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  } catch {
    // best-effort
  }
}
