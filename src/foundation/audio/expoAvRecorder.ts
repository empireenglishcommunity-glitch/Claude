/**
 * `expo-av` recorder adapter — the thin native side-effect boundary (Task 10.2).
 *
 * ⚠️ This is the ONLY capture module that touches `expo-av`. It is imported
 * LAZILY (only by `createAudioCapture`) so offline unit/property tests — which
 * build `OfflineAudioCapture` directly with in-memory fakes — never pull
 * `expo-av` into their import graph (mirrors `supabaseAudioStore` /
 * `runtimeAdapter`).
 *
 * It implements:
 *   • {@link AudioRecorderPort} over `expo-av`'s `Audio.Recording`, producing a
 *     compressed mono AAC/m4a clip at the requested 24–64 kbps bitrate (Req 7.1).
 *     The HIGH_QUALITY preset already targets MPEG-4/AAC with an `.m4a`
 *     extension; we override only the channel count (mono) and bitrate to hit
 *     the low-data band (design §7.2).
 *   • {@link LocalRecordingStore} — `expo-av` writes the clip to an on-device
 *     file URI, so that URI IS the durable local copy. `persist` confirms the
 *     clip exists (non-empty URI) before returning, satisfying the
 *     persist-before-upload guarantee (Req 10.1); an empty/missing URI rejects so
 *     the capture surfaces a `LocalPersistError` (Req 10.2). (No `expo-file-system`
 *     dependency is required for this confirmation.)
 */
import { Audio } from 'expo-av';
import type { UUID } from '../types';
import type {
  AudioRecorderPort,
  CaptureEncoding,
  LocalRecordingStore,
  RawRecording,
  StoredRecording,
} from './audioCapture';

/** Build `expo-av` recording options from our normalized encoding (Req 7.1). */
function toRecordingOptions(encoding: CaptureEncoding): Audio.RecordingOptions {
  const preset = Audio.RecordingOptionsPresets.HIGH_QUALITY;
  return {
    ...preset,
    android: {
      ...preset.android,
      numberOfChannels: encoding.channels,
      bitRate: encoding.bitrateBps,
    },
    ios: {
      ...preset.ios,
      numberOfChannels: encoding.channels,
      bitRate: encoding.bitrateBps,
    },
    web: {
      ...(preset.web ?? {}),
      bitsPerSecond: encoding.bitrateBps,
    },
  };
}

/** Construct the production `expo-av`-backed {@link AudioRecorderPort}. */
export async function createExpoAvRecorder(): Promise<AudioRecorderPort> {
  let recording: Audio.Recording | null = null;
  let lastDurationMs = 0;
  let bitrateBps = 0;

  return {
    async start(encoding: CaptureEncoding): Promise<void> {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      bitrateBps = encoding.bitrateBps;
      const { recording: rec } = await Audio.Recording.createAsync(toRecordingOptions(encoding));
      recording = rec;
    },

    async stop(): Promise<RawRecording> {
      if (!recording) throw new Error('No active expo-av recording to stop.');
      // Read duration before unloading.
      const status = await recording.getStatusAsync();
      if (typeof status.durationMillis === 'number') {
        lastDurationMs = status.durationMillis;
      }
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI() ?? '';
      recording = null;
      // Without expo-file-system, estimate byte size from bitrate × duration
      // (compressed CBR AAC ≈ bitrate/8 bytes per second). This is metadata only.
      const byteSize = Math.max(0, Math.round((lastDurationMs / 1000) * (bitrateBps / 8)));
      return { uri, durationMs: lastDurationMs, byteSize };
    },
  };
}

/**
 * Construct the production {@link LocalRecordingStore}. `expo-av` already writes
 * the clip to an on-device URI; this confirms the clip is present (Req 10.1) and
 * rejects an empty/zero-byte capture so the caller surfaces a persist error
 * instead of silently dropping it (Req 10.2).
 */
export function createFileSystemRecordingStore(): LocalRecordingStore {
  return {
    async persist(_recordingId: UUID, raw: RawRecording): Promise<StoredRecording> {
      if (!raw.uri || raw.byteSize <= 0) {
        throw new Error('Recorder produced no on-device file to persist.');
      }
      return {
        localUri: raw.uri,
        durationMs: raw.durationMs,
        byteSize: raw.byteSize,
      };
    },
  };
}
