import * as Speech from 'expo-speech';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';

/**
 * Pronunciation engine.
 *
 * Two voices:
 *  - OFFLINE (default): the device's built-in en-US voice via `expo-speech`.
 *  - AUTHENTIC (optional, online): a more natural neural voice streamed as audio.
 *
 * Callers pick the voice with the `authentic` flag; everything else is uniform.
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

/* --------------------------- OFFLINE device voice --------------------------- */

let cachedVoiceId: string | null | undefined;

async function getAmericanVoiceId(): Promise<string | undefined> {
  if (cachedVoiceId !== undefined) return cachedVoiceId ?? undefined;
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const enUS = voices.filter((v) => (v.language || '').toLowerCase().startsWith('en-us'));
    const enhanced = enUS.find((v) => (v.quality as unknown as string) === 'Enhanced');
    const chosen = enhanced ?? enUS[0];
    cachedVoiceId = chosen ? chosen.identifier : null;
  } catch {
    cachedVoiceId = null;
  }
  return cachedVoiceId ?? undefined;
}

async function speakDevice(text: string, options: SpeakOptions): Promise<void> {
  const { rate = 'normal', onStart, onDone, onError } = options;
  try {
    const speaking = await Speech.isSpeakingAsync().catch(() => false);
    if (speaking) Speech.stop();
    const voice = await getAmericanVoiceId();
    Speech.speak(text, {
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

/* --------------------------- AUTHENTIC online voice --------------------------- */

let authenticPlayer: AudioPlayer | null = null;
let authenticToken = 0;

function ttsUrl(text: string): string {
  return (
    'https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&tl=en&q=' +
    encodeURIComponent(text)
  );
}

/** Split long text into <=190-char chunks at word boundaries for the TTS endpoint. */
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

  const playNext = () => {
    if (token !== authenticToken) return; // superseded by a newer request
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
    } catch (e) {
      disposeAuthentic();
      onError?.(e);
    }
  };

  playNext();
}

/* --------------------------------- Public API --------------------------------- */

/** Speak English text in an American accent (device offline voice by default). */
export async function speakAmerican(text: string, options: SpeakOptions = {}): Promise<void> {
  const clean = text.trim();
  if (!clean) return;
  if (options.authentic) {
    return speakAuthentic(clean, options);
  }
  return speakDevice(clean, options);
}

export function stopSpeaking(): void {
  Speech.stop();
  authenticToken++; // invalidate any in-flight authentic chain
  disposeAuthentic();
}

export async function isSpeaking(): Promise<boolean> {
  try {
    return await Speech.isSpeakingAsync();
  } catch {
    return false;
  }
}
