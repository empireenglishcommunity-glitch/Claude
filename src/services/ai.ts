/**
 * AI service — powered by a user-provided OpenAI key (stored only on device).
 *
 *  - transcribeAudio: Whisper speech-to-text for Shadowing.
 *  - assessPronunciation: strict score + short Arabic feedback on the weak part.
 *  - generateRelatedWords: smart, "infinite" Conquest word suggestions.
 *
 * Every function degrades gracefully (returns null) when there's no key or the
 * network/API fails, so the app keeps working without AI.
 */

const OPENAI = 'https://api.openai.com/v1';

export function hasAiKey(key: string | undefined | null): boolean {
  return Boolean(key && key.trim().startsWith('sk'));
}

/** Whisper transcription of a recorded audio file (m4a/wav/mp3). */
export async function transcribeAudio(uri: string, key: string): Promise<string | null> {
  try {
    const form = new FormData();
    // React Native FormData file shape.
    form.append('file', { uri, name: 'speech.m4a', type: 'audio/m4a' } as unknown as Blob);
    form.append('model', 'whisper-1');
    form.append('language', 'en');
    form.append('response_format', 'text');

    const res = await fetch(`${OPENAI}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key.trim()}` },
      body: form,
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.trim();
  } catch {
    return null;
  }
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z\s']/g, '').replace(/\s+/g, ' ').trim();
}

/** Levenshtein distance for a simple character-level similarity score. */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

export type PronunciationResult = {
  score: number; // 0..100
  heard: string;
  feedback: string; // short Arabic feedback
  passed: boolean; // strict: only a near-perfect match passes
};

/**
 * Strict pronunciation assessment: transcribe, compare to the target, score,
 * and (via GPT, if reachable) give a one-line Arabic tip on the weak syllable.
 */
export async function assessPronunciation(
  target: string,
  uri: string,
  key: string,
): Promise<PronunciationResult | null> {
  const heardRaw = await transcribeAudio(uri, key);
  if (heardRaw == null) return null;

  const heard = normalize(heardRaw);
  const want = normalize(target);
  const dist = levenshtein(heard, want);
  const score = Math.max(0, Math.round((1 - dist / Math.max(want.length, 1)) * 100));
  const passed = score >= 90;

  let feedback = '';
  try {
    const res = await fetch(`${OPENAI}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content:
              'You are a strict American-English pronunciation coach for Arabic speakers. ' +
              'Given the TARGET word/sentence and what the learner actually said (from speech-to-text), ' +
              'reply with ONE short sentence in Egyptian Arabic telling them exactly which sound or ' +
              'syllable to fix. If it is correct, congratulate briefly in Arabic. Max 18 words.',
          },
          { role: 'user', content: `TARGET: "${target}"\nLEARNER SAID: "${heardRaw}"\nSCORE: ${score}/100` },
        ],
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      feedback = data.choices?.[0]?.message?.content?.trim() ?? '';
    }
  } catch {
    // ignore — feedback stays empty
  }

  if (!feedback) {
    feedback = passed
      ? 'نطق ممتاز! 👏'
      : `قريب — التطبيق سمع: "${heardRaw}". ركّز على نطق الكلمة كاملة وحاول تاني.`;
  }

  return { score, heard: heardRaw, feedback, passed };
}

/** Generate related English words for the smart Conquest map. */
export async function generateRelatedWords(seed: string, key: string): Promise<string[] | null> {
  try {
    const res = await fetch(`${OPENAI}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.5,
        messages: [
          {
            role: 'system',
            content:
              'You suggest English vocabulary for a learner. Given a seed word, return 8 useful, ' +
              'related English words (same topic or theme, common words). Reply ONLY as a JSON ' +
              'array of lowercase single words, no extra text.',
          },
          { role: 'user', content: `Seed: ${seed}` },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content ?? '';
    const match = content.match(/\[[\s\S]*\]/);
    if (!match) return null;
    const arr = JSON.parse(match[0]) as unknown[];
    return arr.map((w) => String(w).toLowerCase().trim()).filter(Boolean).slice(0, 8);
  } catch {
    return null;
  }
}
