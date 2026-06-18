/**
 * Unit lane — offline-resilient audio capture (Task 10.5).
 *
 * Covers the AAC/m4a bitrate bounds (24–64 kbps, Req 7.1) and the
 * persist-before-upload / never-silently-drop behaviour (Req 10.1, 10.2). Runs
 * fully offline against in-memory port fakes — never touches `expo-av`.
 *
 * _Requirements: 7.1, 10.1, 10.2_
 */
import {
  AudioCaptureError,
  buildCaptureEncoding,
  CAPTURE_CHANNELS,
  CAPTURE_FORMAT,
  clampBitrate,
  DEFAULT_BITRATE_BPS,
  isValidBitrate,
  LocalPersistError,
  MAX_BITRATE_BPS,
  MIN_BITRATE_BPS,
  NotRecordingError,
  OfflineAudioCapture,
  RecorderFailedError,
  type AudioRecorderPort,
  type CaptureEncoding,
  type LocalRecordingStore,
  type RawRecording,
  type StoredRecording,
} from '../../src/foundation/audio/audioCapture';
import type { UUID } from '../../src/foundation/types';

// ── Test doubles ─────────────────────────────────────────────────────────────

class FakeRecorder implements AudioRecorderPort {
  started: CaptureEncoding | null = null;
  clip: RawRecording = { uri: 'file:///cache/rec.m4a', durationMs: 4200, byteSize: 16800 };
  failOnStop = false;

  async start(encoding: CaptureEncoding): Promise<void> {
    this.started = encoding;
  }
  async stop(): Promise<RawRecording> {
    if (this.failOnStop) throw new Error('encoder crashed');
    return this.clip;
  }
}

class FakeLocalStore implements LocalRecordingStore {
  persisted: Array<{ id: UUID; raw: RawRecording }> = [];
  fail = false;
  async persist(recordingId: UUID, raw: RawRecording): Promise<StoredRecording> {
    if (this.fail) throw new Error('disk full');
    this.persisted.push({ id: recordingId, raw });
    return { localUri: raw.uri, durationMs: raw.durationMs, byteSize: raw.byteSize };
  }
}

// ── Bitrate bounds (Req 7.1) ─────────────────────────────────────────────────

describe('AAC/m4a bitrate bounds 24–64 kbps (Req 7.1)', () => {
  it('accepts only finite bitrates within [24000, 64000]', () => {
    expect(isValidBitrate(MIN_BITRATE_BPS)).toBe(true);
    expect(isValidBitrate(MAX_BITRATE_BPS)).toBe(true);
    expect(isValidBitrate(32_000)).toBe(true);
    expect(isValidBitrate(MIN_BITRATE_BPS - 1)).toBe(false);
    expect(isValidBitrate(MAX_BITRATE_BPS + 1)).toBe(false);
    expect(isValidBitrate(Number.NaN)).toBe(false);
    expect(isValidBitrate(Number.POSITIVE_INFINITY)).toBe(false);
  });

  it('clamps any request into the valid band', () => {
    expect(clampBitrate(1_000)).toBe(MIN_BITRATE_BPS);
    expect(clampBitrate(1_000_000)).toBe(MAX_BITRATE_BPS);
    expect(clampBitrate(48_000)).toBe(48_000);
    expect(clampBitrate(Number.NaN)).toBe(DEFAULT_BITRATE_BPS);
  });

  it('builds a mono AAC/m4a encoding with an in-band bitrate', () => {
    const e = buildCaptureEncoding(48_000);
    expect(e.format).toBe(CAPTURE_FORMAT);
    expect(e.channels).toBe(CAPTURE_CHANNELS);
    expect(e.channels).toBe(1); // mono
    expect(isValidBitrate(e.bitrateBps)).toBe(true);
    expect(e.bitrateBps).toBe(48_000);
    // Out-of-band requests are clamped, so the produced clip always conforms.
    expect(isValidBitrate(buildCaptureEncoding(5_000).bitrateBps)).toBe(true);
    expect(isValidBitrate(buildCaptureEncoding(500_000).bitrateBps)).toBe(true);
  });

  it('the capture reports an in-band mono AAC/m4a encoding', () => {
    const capture = new OfflineAudioCapture(new FakeRecorder(), new FakeLocalStore(), {
      bitrateBps: 56_000,
    });
    const e = capture.getEncoding();
    expect(e.bitrateBps).toBe(56_000);
    expect(isValidBitrate(e.bitrateBps)).toBe(true);
    expect(e.channels).toBe(1);
  });
});

// ── Persist-before-upload / never drop (Req 10.1, 10.2) ──────────────────────

describe('capture persists locally then confirms (Req 10.1, 10.2)', () => {
  it('persists the clip locally before returning the durable local uri', async () => {
    const recorder = new FakeRecorder();
    const local = new FakeLocalStore();
    const capture = new OfflineAudioCapture(recorder, local, { uuid: () => 'rec-1' });

    await capture.startRecording();
    expect(recorder.started).not.toBeNull();
    expect(isValidBitrate(recorder.started!.bitrateBps)).toBe(true);

    const out = await capture.stopRecording();
    expect(local.persisted).toHaveLength(1); // persisted before returning (Req 10.1)
    expect(local.persisted[0].id).toBe('rec-1');
    expect(out.localUri).toBe('file:///cache/rec.m4a');
    expect(out.durationMs).toBe(4200);
    expect(out.byteSize).toBe(16800);
  });

  it('surfaces a LocalPersistError (never silently drops) when local persistence fails (Req 10.2)', async () => {
    const local = new FakeLocalStore();
    local.fail = true;
    const capture = new OfflineAudioCapture(new FakeRecorder(), local);

    await capture.startRecording();
    await expect(capture.stopRecording()).rejects.toBeInstanceOf(LocalPersistError);
    expect(local.persisted).toHaveLength(0);
  });

  it('surfaces a RecorderFailedError when the recorder fails to produce a clip', async () => {
    const recorder = new FakeRecorder();
    recorder.failOnStop = true;
    const capture = new OfflineAudioCapture(recorder, new FakeLocalStore());

    await capture.startRecording();
    await expect(capture.stopRecording()).rejects.toBeInstanceOf(RecorderFailedError);
  });

  it('rejects stopRecording when no recording is active', async () => {
    const capture = new OfflineAudioCapture(new FakeRecorder(), new FakeLocalStore());
    await expect(capture.stopRecording()).rejects.toBeInstanceOf(NotRecordingError);
  });

  it('typed errors share the AudioCaptureError base', () => {
    expect(new LocalPersistError()).toBeInstanceOf(AudioCaptureError);
    expect(new RecorderFailedError()).toBeInstanceOf(AudioCaptureError);
    expect(new NotRecordingError()).toBeInstanceOf(AudioCaptureError);
  });
});
