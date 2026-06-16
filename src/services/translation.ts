/**
 * Translation layer.
 *
 * Offline-first: curated words already carry a logical Arabic meaning.
 * For other languages — or full sentences, or non-curated words — we fall back
 * to an online translation endpoint when the device has connectivity.
 *
 * The translation aims to convey *meaning*, not a literal word-for-word swap.
 */

export type TranslationResult = {
  text: string;
  source: 'offline' | 'online';
};

/**
 * Online translation using a public, key-less endpoint.
 * @param text   source English text
 * @param target target language code (e.g. 'ar', 'es', 'fr', 'zh-CN')
 * Returns null on any failure so callers can degrade gracefully.
 */
export async function translateOnline(text: string, target: string): Promise<string | null> {
  const clean = text.trim();
  if (!clean) return null;
  try {
    const url =
      'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=' +
      encodeURIComponent(target) +
      '&dt=t&q=' +
      encodeURIComponent(clean);
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as unknown;
    // Shape: [[["translated","original",...], ...], ...]
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const segments = data[0] as unknown[];
      const joined = segments
        .map((seg) => (Array.isArray(seg) ? String(seg[0] ?? '') : ''))
        .join('');
      return joined.trim() || null;
    }
    return null;
  } catch {
    return null;
  }
}

/** Backwards-compatible helper for Arabic. */
export function translateToArabicOnline(text: string): Promise<string | null> {
  return translateOnline(text, 'ar');
}
