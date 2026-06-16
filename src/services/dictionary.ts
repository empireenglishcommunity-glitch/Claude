import { WordEntry, Syllable } from '../data/types';
import { findOfflineWord } from '../data/dictionary';
import { translateToArabicOnline } from './translation';

/**
 * Lookup pipeline:
 *   1) OFFLINE curated entry (instant, no network).
 *   2) ONLINE fallback via the free dictionaryapi.dev for full coverage,
 *      enriched with an Arabic meaning from the translation layer.
 *
 * Callers always get a uniform WordEntry, regardless of source.
 */

const VOWELS = 'aeiouy';

/**
 * Lightweight English syllable splitter used when no curated breakdown exists.
 * It is heuristic (not phonetically perfect) but gives a usable visual segmentation.
 */
export function estimateSyllables(word: string): Syllable[] {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 3) return [{ text: word, stressed: true }];

  const chunks: string[] = [];
  let current = '';
  let prevVowel = false;

  for (let i = 0; i < w.length; i++) {
    const ch = w[i];
    const isVowel = VOWELS.includes(ch);
    current += ch;
    const next = w[i + 1];
    // Break after a vowel cluster when a consonant followed by another vowel begins.
    if (prevVowel && !isVowel && next && VOWELS.includes(next)) {
      chunks.push(current);
      current = '';
    }
    prevVowel = isVowel;
  }
  if (current) chunks.push(current);

  const parts = chunks.length ? chunks : [w];
  // Map heuristic chunks back over the original casing length-wise.
  let cursor = 0;
  const syllables: Syllable[] = parts.map((p) => {
    const slice = word.slice(cursor, cursor + p.length);
    cursor += p.length;
    return { text: slice || p };
  });
  if (cursor < word.length && syllables.length) {
    syllables[syllables.length - 1].text += word.slice(cursor);
  }
  // Default primary stress on the first syllable for multi-syllable words.
  if (syllables.length) syllables[0].stressed = true;
  return syllables;
}

type DictApiPhonetic = { text?: string };
type DictApiDefinition = { definition?: string; example?: string; synonyms?: string[] };
type DictApiMeaning = { partOfSpeech?: string; definitions?: DictApiDefinition[]; synonyms?: string[] };
type DictApiEntry = {
  word?: string;
  phonetic?: string;
  phonetics?: DictApiPhonetic[];
  meanings?: DictApiMeaning[];
};

async function lookupOnline(word: string): Promise<WordEntry | null> {
  try {
    const res = await fetch(
      'https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word),
    );
    if (!res.ok) return null;
    const data = (await res.json()) as DictApiEntry[];
    const entry = Array.isArray(data) ? data[0] : null;
    if (!entry) return null;

    const meaning = entry.meanings?.[0];
    const def = meaning?.definitions?.[0];
    const ipa =
      entry.phonetic ||
      entry.phonetics?.find((p) => p.text)?.text ||
      '';

    const definition = def?.definition || 'No definition available.';
    const example = def?.example || '';
    const synonyms = (meaning?.synonyms || def?.synonyms || []).slice(0, 4);

    // Meaning-focused Arabic translation (online).
    const arabic =
      (await translateToArabicOnline(definition)) ||
      (await translateToArabicOnline(word)) ||
      'الترجمة العربية غير متاحة بدون اتصال بالإنترنت.';

    const exampleArabic = example ? (await translateToArabicOnline(example)) || undefined : undefined;

    return {
      word: entry.word || word,
      ipaUS: ipa ? (ipa.startsWith('/') ? ipa : `/${ipa.replace(/\//g, '')}/`) : '—',
      syllables: estimateSyllables(entry.word || word),
      partOfSpeech: meaning?.partOfSpeech || 'word',
      definition,
      arabic,
      example,
      exampleArabic,
      synonyms,
      source: 'online',
    };
  } catch {
    return null;
  }
}

export type LookupOutcome =
  | { status: 'found'; entry: WordEntry }
  | { status: 'offline-miss' } // not offline, and network failed
  | { status: 'not-found' };

export async function lookupWord(query: string): Promise<LookupOutcome> {
  const word = query.trim();
  if (!word) return { status: 'not-found' };

  const offline = findOfflineWord(word);
  if (offline) return { status: 'found', entry: offline };

  const online = await lookupOnline(word);
  if (online) return { status: 'found', entry: online };

  return { status: 'offline-miss' };
}
