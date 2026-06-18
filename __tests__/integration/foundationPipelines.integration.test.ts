/**
 * Integration lane — end-to-end Foundation pipelines composed through the
 * Foundation SDK (Task 11.2, design §3.1 / §3.2 / §3.3).
 *
 * Exercises the FINAL P1 wiring by composing a {@link FoundationSdk} from the
 * established in-memory fakes (the offline analog of the production
 * `createFoundationSdk` graph), so the full pipelines run OFFLINE and
 * deterministically — no Deno, no live Supabase, no provider keys:
 *
 *   (a) §3.1  funnel claim → signUp → redeem → profile bootstrapped with
 *             tier / region / Telegram id (through `sdk.completeFunnelEntry`).
 *   (b) §3.2  record (AudioCapture) → upload (AudioApi signed URL) → assess
 *             (AiApi → AiRouter via the reference adapters) → profile scores +
 *             error history written → playback URL.
 *   (c) §3.3  offline: enqueue while offline → reconnect flush → reconcile,
 *             recording evaluated.
 *
 * A guarded `describe.skip` documents where the live-backend variants (real Edge
 * Functions + Supabase + Storage) would run when credentials are present; the
 * offline pipelines below always run and must pass.
 *
 * _Requirements: 5.3, 6.3, 7.5, 8.6, 10.4_
 */
import { FoundationSdk, ProfileLocalePersistPort } from '../../src/foundation/sdk';
import { AuthApi } from '../../src/foundation/auth/authApi';
import { ProfileApi } from '../../src/foundation/profile/profileApi';
import { AudioApi, UPLOAD_URL_TTL_SECONDS, PLAYBACK_URL_TTL_SECONDS } from '../../src/foundation/audio/audioApi';
import {
  OfflineAudioCapture,
  type AudioRecorderPort,
  type CaptureEncoding,
  type LocalRecordingStore,
  type RawRecording,
  type StoredRecording,
} from '../../src/foundation/audio/audioCapture';
import {
  OfflineOutbox,
  type ConnectivityPort,
  type EvaluationSubmitter,
  type OutboxEntry,
  type RecordingUploader,
} from '../../src/foundation/audio/outbox';
import { DefaultAiRouter } from '../../src/foundation/ai/aiRouter';
import { TierCostGuard } from '../../src/foundation/ai/costGuard';
import { InMemoryAiCache } from '../../src/foundation/ai/aiCache';
import { REFERENCE_SPEECH_PROVIDER, REFERENCE_LANGUAGE_PROVIDER } from '../../src/foundation/ai/referenceAdapters';
import { FunnelClaimService } from '../../src/foundation/funnel/funnelClaimService';
import {
  LocaleController,
  type DirectionPort,
} from '../../src/foundation/i18n/localeController';
import type { LayoutDirection } from '../../src/foundation/i18n/localeLogic';
import type { AiApi, AssessRequest, EvaluationJob, UUID, UiLocale } from '../../src/foundation/types';
import { referenceRegistry } from '../helpers/aiTestDoubles';
import { InMemoryProfileStore } from '../helpers/inMemoryProfileStore';
import { InMemoryAuthPort } from '../helpers/inMemoryAuthPort';
import { InMemoryClaimStore } from '../helpers/inMemoryClaimStore';
import { InMemoryAudioStore } from '../helpers/inMemoryAudioStore';
import { InMemoryOutboxStore } from '../helpers/inMemoryOutboxStore';
import { InMemoryUsageStore } from '../helpers/inMemoryUsageStore';

const FIXED_NOW_ISO = '2026-06-17T21:00:00.000Z';
const FIXED_NOW_MS = Date.parse(FIXED_NOW_ISO);
const FIXED_NOW_SECONDS = Math.floor(FIXED_NOW_MS / 1000);
const REFERENCE_TEXT = 'the quick brown fox thinks about everything';

function seqUuid(prefix: string): () => UUID {
  let n = 0;
  return () => `${prefix}-${(n += 1)}`;
}

// ── Deterministic capture fakes (offline, no expo-av) ───────────────────────

class FakeRecorder implements AudioRecorderPort {
  lastEncoding: CaptureEncoding | null = null;
  async start(encoding: CaptureEncoding): Promise<void> {
    this.lastEncoding = encoding;
  }
  async stop(): Promise<RawRecording> {
    return { uri: 'file://tmp/raw.m4a', durationMs: 3200, byteSize: 12_800 };
  }
}

class FakeLocalStore implements LocalRecordingStore {
  async persist(recordingId: UUID, raw: RawRecording): Promise<StoredRecording> {
    return { localUri: `file://local/${recordingId}.m4a`, durationMs: raw.durationMs, byteSize: raw.byteSize };
  }
}

// ── Offline AI/upload adapters bound to the authenticated session ────────────
// These mirror the production EdgeAiApi / BackendRecordingUploader: the user is
// resolved from the session (server-side from the JWT in production), the router
// runs the reference adapters, and the uploader mints an AudioApi signed URL.

class SessionBoundAiApi implements AiApi {
  constructor(private readonly router: DefaultAiRouter, private readonly auth: AuthApi) {}
  private async userId(): Promise<UUID> {
    const session = await this.auth.getSession();
    if (!session) throw new Error('no session');
    return session.userId;
  }
  async assessPronunciation(req: AssessRequest) {
    return this.router.assessPronunciation(await this.userId(), req);
  }
  async generate(req: Parameters<AiApi['generate']>[0]) {
    return this.router.generate(await this.userId(), req);
  }
}

class SessionBoundUploader implements RecordingUploader {
  readonly mintedUrls: string[] = [];
  constructor(private readonly audio: AudioApi, private readonly auth: AuthApi) {}
  async upload(job: EvaluationJob): Promise<void> {
    const session = await this.auth.getSession();
    if (!session) throw new Error('no session');
    const file = job.meta.audioStoragePath.split('/').pop() ?? '';
    const recordingId = file.replace(/\.[^.]+$/, '');
    const { url } = await this.audio.getUploadUrl(session.userId, recordingId);
    this.mintedUrls.push(url);
  }
}

class AiEvaluationSubmitter implements EvaluationSubmitter {
  constructor(private readonly ai: AiApi) {}
  async submit(job: EvaluationJob): Promise<{ recordingId: UUID }> {
    const { recordingId } = await this.ai.assessPronunciation(job.meta);
    return { recordingId };
  }
}

interface ToggleConnectivity extends ConnectivityPort {
  online: boolean;
}

interface Wiring {
  sdk: FoundationSdk;
  profileStore: InMemoryProfileStore;
  audioStore: InMemoryAudioStore;
  funnel: FunnelClaimService;
  connectivity: ToggleConnectivity;
  uploader: SessionBoundUploader;
  outboxStore: InMemoryOutboxStore;
  reconciled: OutboxEntry[][];
  directionApplied: { direction: LayoutDirection; locale: UiLocale }[];
}

/** Compose a FoundationSdk over in-memory fakes (offline analog of createFoundationSdk). */
function wire(options: { requireConfirmation?: boolean } = {}): Wiring {
  const profileStore = new InMemoryProfileStore();
  const profile = new ProfileApi(profileStore, { now: () => FIXED_NOW_ISO, uuid: seqUuid('err') });

  const claims = new InMemoryClaimStore();
  const funnel = new FunnelClaimService(claims, profile, { nowMs: () => FIXED_NOW_MS });
  const authPort = new InMemoryAuthPort({
    requireConfirmation: options.requireConfirmation ?? false,
    now: () => FIXED_NOW_SECONDS,
  });
  const auth = new AuthApi(authPort, profile, {
    claimRedeemer: funnel,
    now: () => FIXED_NOW_SECONDS,
  });

  const audioStore = new InMemoryAudioStore();
  const audio = new AudioApi(audioStore, { now: () => FIXED_NOW_ISO, uuid: seqUuid('row') });

  const router = new DefaultAiRouter({
    registry: referenceRegistry(),
    costGuard: new TierCostGuard(new InMemoryUsageStore(), { now: () => FIXED_NOW_MS }),
    cache: new InMemoryAiCache(),
    profiles: profile,
    now: () => FIXED_NOW_ISO,
  });
  const ai = new SessionBoundAiApi(router, auth);

  const capture = new OfflineAudioCapture(new FakeRecorder(), new FakeLocalStore(), { uuid: seqUuid('cap') });

  const connectivity: ToggleConnectivity = {
    online: true,
    isOnline() {
      return this.online;
    },
  };
  const uploader = new SessionBoundUploader(audio, auth);
  const outboxStore = new InMemoryOutboxStore();
  const reconciled: OutboxEntry[][] = [];
  const outbox = new OfflineOutbox({
    store: outboxStore,
    uploader,
    submitter: new AiEvaluationSubmitter(ai),
    connectivity,
    onReconcile: (entries) => reconciled.push(entries),
    now: () => FIXED_NOW_ISO,
    sleep: async () => {},
  });

  const directionApplied: { direction: LayoutDirection; locale: UiLocale }[] = [];
  const director: DirectionPort = {
    apply(direction, locale) {
      directionApplied.push({ direction, locale });
    },
  };
  const locale = new LocaleController(new ProfileLocalePersistPort(auth, profile), director, {
    initialLocale: 'ar',
  });

  const sdk = new FoundationSdk({ auth, profile, audio, ai, capture, outbox, locale });
  return { sdk, profileStore, audioStore, funnel, connectivity, uploader, outboxStore, reconciled, directionApplied };
}

describe('Foundation pipelines (offline, composed through the SDK)', () => {
  it('(a) §3.1 funnel claim → signUp → redeem → profile bootstrapped with carried context', async () => {
    const { sdk, profileStore, funnel } = wire({ requireConfirmation: true });

    // Bot mints a claim + deep link; the app extracts the token via the SDK.
    const created = await funnel.createClaim({ telegramId: 'tg-3001', tier: 'empire', region: 'international' });
    const token = sdk.parseClaimToken(created.deepLink);
    expect(token).toBe(created.token);

    // signUp → redeem, entirely through the single SDK surface (Req 5.3, 6.3).
    const profile = await sdk.completeFunnelEntry({
      token: token as string,
      email: 'founder@empire.test',
      password: 'super-secret-pw',
    });

    expect(profile.tier).toBe('empire');
    expect(profile.region).toBe('international');
    expect(profile.telegramId).toBe('tg-3001');
    expect(profileStore.totalProfiles()).toBe(1);

    // Reading back through the SDK reflects the bootstrapped profile.
    const fetched = await sdk.profile.get(profile.userId);
    expect(fetched.tier).toBe('empire');
  });

  it('(b) §3.2 record → upload → assess → profile write → playback', async () => {
    const { sdk, audioStore } = wire();

    const { userId } = await sdk.auth.signUp('learner@empire.test', 'super-secret-pw');

    // 1. Record (compressed mono AAC/m4a; persisted locally before upload).
    await sdk.capture.startRecording();
    const clip = await sdk.capture.stopRecording();
    expect(clip.localUri).toContain('file://local/');
    expect(clip.byteSize).toBeGreaterThan(0);

    // 2. Upload via an AudioApi signed URL scoped to the owning learner (Req 7.2).
    const recordingId = 'rec-b-1';
    const { url, storagePath } = await sdk.audio.getUploadUrl(userId, recordingId);
    expect(url).toContain('memory://upload/');
    expect(storagePath).toBe(`recordings/${userId}/${recordingId}.m4a`);
    expect(audioStore.uploadUrls[0].ttlSeconds).toBeLessThanOrEqual(UPLOAD_URL_TTL_SECONDS);

    // 3. Register metadata only AFTER the successful upload (Req 7.5).
    const ref = await sdk.audio.registerRecording(userId, {
      storagePath,
      kind: 'drill',
      referenceText: REFERENCE_TEXT,
      durationMs: clip.durationMs,
      byteSize: clip.byteSize,
      createdAt: FIXED_NOW_ISO,
      accentScoreAtTime: null,
    });
    expect(ref.storagePath).toBe(storagePath);

    // 4. Assess via the AiApi (router + reference adapters); provider tagged server-side.
    const bundle = await sdk.ai.assessPronunciation({
      audioStoragePath: storagePath,
      referenceText: REFERENCE_TEXT,
      targetSounds: ['th_voiceless'],
    });
    expect(bundle.recordingId).toBe(recordingId);
    expect(bundle.result.provider).toBe(REFERENCE_SPEECH_PROVIDER);
    expect(bundle.feedback.provider).toBe(REFERENCE_LANGUAGE_PROVIDER);

    // 5. Scores + error history were written to Layer 0 BEFORE returning (Req 8.6).
    const profile = await sdk.profile.get(userId);
    expect(profile.accentProfile.overallAccentScore).toBe(bundle.result.overallScore);
    expect(profile.skillScores.speakingFluency).toBe(bundle.result.fluency);
    const focus = profile.accentProfile.targetSounds.find((t) => t.sound === 'th_voiceless');
    expect(focus?.score).toBe(bundle.result.overallScore);
    const expectedErrors = bundle.result.words
      .flatMap((w) => w.phonemes)
      .filter((p) => p.actual !== null && p.actual !== p.expected).length;
    expect(profile.errorHistory.length).toBe(expectedErrors);

    // 6. Playback URL for before/after replay (Req 7.7).
    const playback = await sdk.audio.getPlaybackUrl(userId, storagePath);
    expect(playback).toContain('memory://playback/');
    expect(audioStore.playbackUrls[0].ttlSeconds).toBeLessThanOrEqual(PLAYBACK_URL_TTL_SECONDS);
  });

  it('(c) §3.3 offline enqueue → reconnect flush → reconcile, recording evaluated', async () => {
    const { sdk, connectivity, uploader, reconciled } = wire();

    const { userId } = await sdk.auth.signUp('offline@empire.test', 'super-secret-pw');

    const job: EvaluationJob = {
      id: 'job-offline-1',
      localUri: 'file://local/cap-1.m4a',
      meta: {
        audioStoragePath: `recordings/${userId}/rec-c-1.m4a`,
        referenceText: REFERENCE_TEXT,
        targetSounds: ['th_voiceless'],
      },
      enqueuedAt: FIXED_NOW_ISO,
    };

    // Offline: enqueue persists the job pending; a flush is a no-op (Req 10.3).
    connectivity.online = false;
    await sdk.outbox.enqueue(job);
    const offlineReport = await sdk.outbox.flush();
    expect(offlineReport.online).toBe(false);
    expect((await sdk.outbox.pending()).map((j) => j.id)).toEqual(['job-offline-1']);

    // Reconnect: flush uploads + submits, evaluates the recording, reconciles (Req 10.4).
    connectivity.online = true;
    const onlineReport = await sdk.outbox.flush();
    expect(onlineReport.online).toBe(true);
    expect(onlineReport.evaluated).toBe(1);
    expect(await sdk.outbox.pending()).toHaveLength(0);

    const entries = await sdk.outbox.entries();
    const entry = entries.find((e) => e.job.id === 'job-offline-1');
    expect(entry?.state).toBe('evaluated');
    expect(entry?.recordingId).toBe('rec-c-1');

    // The flush minted an AudioApi signed upload URL and reconciled the UI.
    expect(uploader.mintedUrls).toHaveLength(1);
    expect(reconciled.length).toBeGreaterThan(0);

    // The evaluated recording's scores landed on the Layer 0 profile.
    const profile = await sdk.profile.get(userId);
    expect(profile.accentProfile.targetSounds.some((t) => t.sound === 'th_voiceless')).toBe(true);
  });
});

const hasBackendCredentials =
  !!process.env.EXPO_PUBLIC_SUPABASE_URL && !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

(hasBackendCredentials ? describe : describe.skip)(
  'Foundation pipelines via live backend (guarded)',
  () => {
    it.todo('§3.1 create-funnel-claim → signUp → redeem-funnel-claim Edge Functions');
    it.todo('§3.2 record → Storage upload → ai-router assess → profile write → playback');
    it.todo('§3.3 offline enqueue → reconnect flush against live backend');
  },
);
