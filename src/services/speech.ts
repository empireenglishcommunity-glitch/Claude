import * as Speech from 'expo-speech';

/**
 * Pronunciation engine.
 *
 * Default: the device's built-in en-US voice — works 100% OFFLINE.
 * The architecture leaves room for an optional online "Authentic Voice"
 * (neural TTS) that can be slotted in later without touching callers.
 */

export type SpeechRate = 'slow' | 'normal';

const RATE_MAP: Record<SpeechRate, number> = {
  // expo-speech rate: lower = slower. Tuned for clear American delivery.
  slow: 0.45,
  normal: 0.92,
};

let cachedVoiceId: string | null | undefined;

/** Pick the best available American English voice on the device. */
async function getAmericanVoiceId(): Promise<string | undefined> {
  if (cachedVoiceId !== undefined) return cachedVoiceId ?? undefined;
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const enUS = voices.filter((v) => (v.language || '').toLowerCase().startsWith('en-us'));
    // Prefer "enhanced"/"premium" quality voices when present.
    const enhanced = enUS.find((v) => (v.quality as unknown as string) === 'Enhanced');
    const chosen = enhanced ?? enUS[0];
    cachedVoiceId = chosen ? chosen.identifier : null;
  } catch {
    cachedVoiceId = null;
  }
  return cachedVoiceId ?? undefined;
}

export type SpeakOptions = {
  rate?: SpeechRate;
  onStart?: () => void;
  onDone?: () => void;
  onError?: (e: unknown) => void;
};

/** Speak any English text in an American accent (offline). */
export async function speakAmerican(text: string, options: SpeakOptions = {}): Promise<void> {
  const { rate = 'normal', onStart, onDone, onError } = options;
  const clean = text.trim();
  if (!clean) return;

  try {
    // Stop anything currently playing for a clean re-trigger.
    const speaking = await Speech.isSpeakingAsync().catch(() => false);
    if (speaking) Speech.stop();

    const voice = await getAmericanVoiceId();

    Speech.speak(clean, {
      language: 'en-US',
      voice,
      pitch: 1.0,
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

export function stopSpeaking(): void {
  Speech.stop();
}

export async function isSpeaking(): Promise<boolean> {
  try {
    return await Speech.isSpeakingAsync();
  } catch {
    return false;
  }
}
