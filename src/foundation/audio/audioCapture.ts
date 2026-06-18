/**
 * Offline-resilient audio capture (Task 10.2).
 *
 * Realizes the design §6 {@link AudioCapture} contract (`startRecording` /
 * `stopRecording`) for the §7.2 low-data pipeline. It produces a COMPRESSED
 * mono AAC/m4a clip at a bitrate in the 24–64 kbps band (Req 7.1) and — the
 * offline-durability guarantee — PERSISTS every capture locally and CONFIRMS
 * that persistence BEFORE any upload is attempted (Req 10.1). If the local
 * persist fails it surfaces a typed error and never silently drops the
 * recording (Req 10.2).
 *
 * ── Testability decision (mirrors the rest of the foundation) ───────────────
 * Two side-effect ports are injected so the whole capture flow runs offline and
 * deterministically (Task 10.5 unit test, Property 10):
 *   • {@link AudioRecorderPort} — wraps `expo-av` recording; tests inject a fake
 *     that returns a canned clip (and can simulate encode failures).
 *   • {@link LocalRecordingStore} — the device-local persistence + confirmation
 *     step; tests inject an in-memory fake (and a failing fake for Req 10.2).
 * The real `expo-av` adapter lives in `expoAvRecorder.ts` and is reached only
 * via `createAudioCapture`'s lazy import, so it stays out of the test graph.
 *
 * The encoding CONFIG (bitrate bounds, channel count, format) is expressed as
 * pure, testable helpers so the 24–64 kbps bound is verifiable without `expo-av`.
 */
import type { AudioCapture, UUID } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// Encoding config — compressed mono AAC/m4a, 24–64 kbps (Req 7.1, design §7.2)
// ═══════════════════════════════════════════════════════════════════════════

/** Minimum allowed capture bitrate in bits/sec (24 kbps). */
export const MIN_BITRATE_BPS = 24_000;
/** Maximum allowed capture bitrate in bits/sec (64 kbps). */
export const MAX_BITRATE_BPS = 64_000;
/** Default capture bitrate (mid-band) — small files for MENA mobile. */
export const DEFAULT_BITRATE_BPS = 32_000;
/** Mono — a single channel keeps files small (design §7.2). */
export const CAPTURE_CHANNELS = 1;
/** Container/codec the clip is encoded as. */
export const CAPTURE_FORMAT = 'aac/m4a' as const;
/** File extension for a captured clip. */
export const CAPTURE_EXTENSION = 'm4a';

/** True iff `bps` is a finite bitrate within the inclusive 24–64 kbps band (Req 7.1). */
export function isValidBitrate(bps: number): boolean {
  return Number.isFinite(bps) && bps >= MIN_BITRATE_BPS && bps <= MAX_BITRATE_BPS;
}

/** Clamp an arbitrary bitrate request into the valid 24–64 kbps band. */
export function clampBitrate(bps: number): number {
  if (!Number.isFinite(bps)) return DEFAULT_BITRATE_BPS;
  return Math.min(MAX_BITRATE_BPS, Math.max(MIN_BITRATE_BPS, Math.round(bps)));
}

/** Normalized, provider-independent encoding options for a capture. */
export interface CaptureEncoding {
  format: typeof CAPTURE_FORMAT;
  extension: string;
  channels: number;
  bitrateBps: number;
}

/**
 * Build the (validated) encoding options for a capture. A requested bitrate is
 * clamped into the 24–64 kbps band so the produced clip always satisfies Req 7.1
 * by construction; mono + AAC/m4a are fixed.
 */
export function buildCaptureEncoding(bitrateBps: number = DEFAULT_BITRATE_BPS): CaptureEncoding {
  return {
    format: CAPTURE_FORMAT,
    extension: CAPTURE_EXTENSION,
    channels: CAPTURE_CHANNELS,
    bitrateBps: clampBitrate(bitrateBps),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Typed errors
// ═══════════════════════════════════════════════════════════════════════════

/** Base class for all audio-capture errors. */
export class AudioCaptureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Raised when the recorder fails to produce a clip (encode/hardware error). */
export class RecorderFailedError extends AudioCaptureError {
  constructor(public readonly cause?: unknown) {
    super('Audio recorder failed to produce a recording.');
  }
}

/**
 * Raised when a captured clip could NOT be persisted locally / confirmed
 * (Req 10.2). The recording is NOT silently dropped — the caller surfaces this
 * indication so the learner can retry. This is the key offline-durability guard.
 */
export class LocalPersistError extends AudioCaptureError {
  constructor(public readonly cause?: unknown) {
    super('Could not persist the recording on this device.');
  }
}

/** Raised when `stopRecording` is called without an active recording. */
export class NotRecordingError extends AudioCaptureError {
  constructor() {
    super('No active recording to stop.');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Injectable ports
// ═══════════════════════════════════════════════════════════════════════════

/** A raw clip produced by the recorder before local persistence. */
export interface RawRecording {
  /** Transient source URI from the recorder. */
  uri: string;
  durationMs: number;
  byteSize: number;
}

/**
 * The low-level recorder the capture depends on. Production wraps `expo-av`
 * (see `expoAvRecorder.ts`); tests inject a fake. `start` configures + begins
 * recording with the given encoding; `stop` finalizes and returns the clip.
 */
export interface AudioRecorderPort {
  start(encoding: CaptureEncoding): Promise<void>;
  stop(): Promise<RawRecording>;
}

/** The confirmed result of persisting a clip to device-local storage. */
export interface StoredRecording {
  /** The durable local URI the Outbox will reference. */
  localUri: string;
  durationMs: number;
  byteSize: number;
}

/**
 * Device-local persistence for captures. `persist` MUST durably store the clip
 * and only resolve once persistence is CONFIRMED (Req 10.1); it MUST reject if
 * the clip cannot be confirmed (→ {@link LocalPersistError}, Req 10.2).
 */
export interface LocalRecordingStore {
  persist(recordingId: UUID, raw: RawRecording): Promise<StoredRecording>;
}

// ═══════════════════════════════════════════════════════════════════════════
// The capture implementation
// ═══════════════════════════════════════════════════════════════════════════

export interface OfflineAudioCaptureOptions {
  /** Requested bitrate (clamped to 24–64 kbps). Default 32 kbps. */
  bitrateBps?: number;
  /** Injectable id generator for the recording id (tests). */
  uuid?: () => UUID;
}

function defaultUuid(): UUID {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Requirement-faithful realization of the design §6 {@link AudioCapture}. Always
 * encodes within the 24–64 kbps band and persists-then-confirms locally before
 * returning, so a captured recording is never lost (Req 7.1, 10.1, 10.2).
 */
export class OfflineAudioCapture implements AudioCapture {
  private readonly recorder: AudioRecorderPort;
  private readonly local: LocalRecordingStore;
  private readonly encoding: CaptureEncoding;
  private readonly uuid: () => UUID;
  private active = false;

  constructor(
    recorder: AudioRecorderPort,
    local: LocalRecordingStore,
    options: OfflineAudioCaptureOptions = {},
  ) {
    this.recorder = recorder;
    this.local = local;
    this.encoding = buildCaptureEncoding(options.bitrateBps ?? DEFAULT_BITRATE_BPS);
    this.uuid = options.uuid ?? defaultUuid;
  }

  /** The encoding (format/channels/bitrate) this capture produces. */
  getEncoding(): CaptureEncoding {
    return this.encoding;
  }

  /** Begin a compressed mono AAC/m4a recording (Req 7.1). */
  async startRecording(): Promise<void> {
    if (this.active) return; // idempotent start
    try {
      await this.recorder.start(this.encoding);
      this.active = true;
    } catch (cause) {
      throw new RecorderFailedError(cause);
    }
  }

  /**
   * Finalize the recording, PERSIST it locally, and only then return its durable
   * local reference (Req 10.1). A recorder failure → {@link RecorderFailedError};
   * a local-persist failure → {@link LocalPersistError} (never a silent drop,
   * Req 10.2).
   */
  async stopRecording(): Promise<{ localUri: string; durationMs: number; byteSize: number }> {
    if (!this.active) throw new NotRecordingError();

    let raw: RawRecording;
    try {
      raw = await this.recorder.stop();
    } catch (cause) {
      this.active = false;
      throw new RecorderFailedError(cause);
    }
    this.active = false;

    const recordingId = this.uuid();
    let stored: StoredRecording;
    try {
      stored = await this.local.persist(recordingId, raw);
    } catch (cause) {
      // Persistence failed → surface an error; do NOT drop the recording (Req 10.2).
      throw new LocalPersistError(cause);
    }

    return {
      localUri: stored.localUri,
      durationMs: stored.durationMs,
      byteSize: stored.byteSize,
    };
  }
}

/**
 * Construct the production capture backed by the `expo-av` recorder and a
 * filesystem-backed local store. Imported LAZILY so offline tests that inject
 * fakes never pull `expo-av` into their import graph (mirrors `createAudioApi`).
 */
export async function createAudioCapture(
  options: OfflineAudioCaptureOptions = {},
): Promise<OfflineAudioCapture> {
  const { createExpoAvRecorder, createFileSystemRecordingStore } = await import('./expoAvRecorder');
  const recorder = await createExpoAvRecorder();
  const local = createFileSystemRecordingStore();
  return new OfflineAudioCapture(recorder, local, options);
}
