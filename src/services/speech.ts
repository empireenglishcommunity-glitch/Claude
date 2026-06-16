import * as Speech from 'expo-speech';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';

/**
 * Pronunciation engine.
 *
 *  - OFFLINE (default): the device's built-in en-US voice (a "male" voice when
 *    available), pitched slightly lower. Works 100% offline.
 *  - AUTHENTIC (toggle on): first tries a more natural ONLINE voice; if that
 *    can't start quickly it falls back to a DISTINCT en-US voice (a "female"
 *    voice when available), pitched slightly higher.
 *
 * The result: flipping the toggle always produces an audible change.
 */

export type SpeechRate = 'slow' | 'normal';

const RATE_MAP: Record<SpeechRate, number> = {
  slow: 0.45,
  normal: 0.92,
};

export type SpeakOptions = {
  rate?: SpeechRate;
  authentic?: boolean;
  onStart?: () => void;
  onDone?: () => void;
  onError?: (e: unknown) => void;
};

/* ------------------------------ voice selection ------------------------------ */

const FEMALE_HINTS = ['samantha', 'allison', 'ava', 'susan', 'karen', 'victoria', 'zoe', 'nicky', 'joelle', 'female', 'serena'];
const MALE_HINTS = ['aaron', 'fred', 'daniel', 'tom', 'alex', 'albert', 'bruce', 'arthur', 'male', 'reed', 'rishi'];

type VoicePair = { male?: string; female?: string };
let cachedPair: VoicePair | null = null;

async function getVoicePair(): Promise<VoicePair> {
  if (cachedPair) return cachedPair;
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const enUS = voices.filter((v) => (v.language || '').toLowerCase().startsWith('en-us'));
    const byName = (hints: string[]) =>
      enUS.find((v) => hints.some((h) => (v.name || '').toLowerCase().includes(h)))?.identifier;

    let male = byName(MALE_HINTS);
    let female = byName(FEMALE_HINTS);

    // Ensure both are defined and distinct so the toggle is always audible.
    if (!male) male = enUS[0]?.identifier;
    if (!female) female = enUS.find((v) => v.identifier !== male)?.identifier ?? enUS[1]?.identifier ?? male;

    cachedPair = { male, female };
  } catch {
    cachedPair = {};
  }
  return cachedPair;
}

/* --------------------------- device voice playback --------------------------- */

async function speakDevice(text: string, options: SpeakOptions): Promise<void> {
  const { rate = 'normal', authentic = false, onStart, onDone, onError } = options;
  try {
    const speaking = await Speech.isSpeakingAsync().catch(() => false);
    if (speaking) Speech.stop();
    const pair = await getVoicePair();
    const voice = authentic ? pair.female : pair.male;
    Speech.speak(text, {
      language: 'en-US',
      voice,
      pitch: authentic ? 1.12 : 0.9,
      rate: RATE_MAP[rate],
      onStart,
      onDone,
      onStopped: onDone,
      onError,
    });
  } catch (e) {
    onError?.(e);
  }
}

/* --------------------------- authentic online voice -------------------------- */

let authenticPlayer: AudioPlayer | null = null;
let authenticToken = 0;

function ttsUrl(text: string): string {
  return (
    'https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&tl=en&q=' +
    encodeURIComponent(text)
  );
}

function chunkText(text: string, max = 190): string[] {
  const words = text.trim().split(/\s+/);
  const chunks: string[] = [];
  let current = '';
  for (const w of words) {
    if ((current + ' ' + w).trim().length > max) {
      if (current) chunks.push(current.trim());
      current = w;
    } else {
      current = (current + ' ' + w).trim();
    }
  }
  if (current) chunks.push(current.trim());
  return chunks.length ? chunks : [text];
}

function disposeAuthentic() {
  if (authenticPlayer) {
    try {
      authenticPlayer.remove();
    } catch {
      // ignore
    }
    authenticPlayer = null;
  }
}

/** Try the online voice; if it doesn't begin playing quickly, fall back to a distinct device voice. */
async function speakAuthentic(text: string, options: SpeakOptions): Promise<void> {
  const { onStart, onDone, onError } = options;
  const token = ++authenticToken;
  disposeAuthentic();

  try {
    await setAudioModeAsync({ playsInSilentMode: true });
  } catch {
    // non-fatal
  }

  const chunks = chunkText(text);
  let index = 0;
  let started = false;
  let fellBack = false;

  const fallback = () => {
    if (fellBack || token !== authenticToken) return;
    fellBack = true;
    disposeAuthentic();
    // Distinct device voice so the user still hears the "authentic" change.
    speakDevice(text, { ...options, authentic: true });
  };

  const playNext = () => {
    if (token !== authenticToken) return;
    if (index >= chunks.length) {
      disposeAuthentic();
      onDone?.();
      return;
    }
    const url = ttsUrl(chunks[index]);
    index += 1;
    try {
      const player = createAudioPlayer(url);
      authenticPlayer = player;
      const sub = player.addListener('playbackStatusUpdate', (status) => {
        if (token !== authenticToken) return;
        if (!started && status.playing) {
          started = true;
          onStart?.();
        }
        if (status.didJustFinish) {
          sub.remove();
          try {
            player.remove();
          } catch {
            // ignore
          }
          playNext();
        }
      });
      player.play();
    } catch {
      fallback();
    }
  };

  // If the online voice hasn't started within ~1.3s, fall back to the device voice.
  setTimeout(() => {
    if (!started) fallback();
  }, 1300);

  playNext();
}

/* --------------------------------- public API -------------------------------- */

export async function speakAmerican(text: string, options: SpeakOptions = {}): Promise<void> {
  const clean = text.trim();
  if (!clean) return;
  if (options.authentic) {
    return speakAuthentic(clean, options);
  }
  return speakDevice(clean, { ...options, authentic: false });
}

export function stopSpeaking(): void {
  Speech.stop();
  authenticToken++;
  disposeAuthentic();
}

export async function isSpeaking(): Promise<boolean> {
  try {
    return await Speech.isSpeakingAsync();
  } catch {
    return false;
  }
}
