/**
 * Foundation Client SDK — the single typed surface for the app shell (Task 11.1).
 *
 * This is the FINAL wiring of Project P1: it composes the already-built, tested
 * foundation modules into ONE typed {@link FoundationSdk} surface so that ALL
 * app data / auth / storage / AI / i18n access flows through a single object and
 * never touches Supabase, an Edge endpoint, or a provider SDK directly
 * (design §2.1, §6; Requirements 1.3, 1.4, 4.1). It composes — it does NOT
 * duplicate logic:
 *
 *   • {@link AuthApi}   — Supabase Auth + funnel-claim redemption
 *   • {@link ProfileApi}— Unified Learner Profile (Layer 0) read/write
 *   • {@link AudioApi}  — private per-learner recording storage (signed URLs)
 *   • {@link AiApi}     — AI access, ONLY via the `ai-router` Edge Function
 *   • {@link AudioCapture} — offline-resilient compressed capture
 *   • {@link OfflineOutbox} — offline evaluation queue + low-data flush
 *   • {@link LocaleController} — Arabic-first / RTL i18n
 *
 * It also wires the Telegram funnel deep-link entry path (design §3.1): the app
 * shell's claim route hands an inbound `empireenglish://claim?token=...` link to
 * {@link FoundationSdk.parseClaimToken}, then completes account creation via
 * {@link FoundationSdk.completeFunnelEntry} (sign-up → redeem).
 *
 * ── Production wiring vs. test composition ──────────────────────────────────
 * {@link createFoundationSdk} lazily wires the PRODUCTION implementations over
 * the shared backend client (so importing this module never eagerly pulls the
 * backend client, expo-av, AsyncStorage, or i18next runtime into a unit test's
 * graph). Tests compose a {@link FoundationSdk} directly from in-memory fakes
 * (see `__tests__/integration/foundationPipelines.integration.test.ts`), which
 * is why the constructor takes the parts as plain dependencies.
 */
import type { AiApi, AudioCapture, LearnerProfile, UUID, UiLocale } from './types';
import { getBackendClient } from './backendClient';
import { AuthApi } from './auth/authApi';
import { ProfileApi, createProfileApi } from './profile/profileApi';
import { AudioApi, createAudioApi } from './audio/audioApi';
import { EdgeAiApi } from './ai/aiApi';
import { recordingIdFromPath } from './ai/aiRouter';
import { createAudioCapture } from './audio/audioCapture';
import {
  OfflineOutbox,
  createOutbox,
  type ConnectivityPort,
  type EvaluationSubmitter,
  type RecordingUploader,
} from './audio/outbox';
import { LocaleController, createLocaleController, type LocalePersistPort } from './i18n/localeController';
import type { EvaluationJob } from './types';
import {
  extractClaimToken,
  isClaimLink,
  signUpAndRedeemClaim,
  type FunnelEntryParams,
} from './funnel/claimEntry';

// ═══════════════════════════════════════════════════════════════════════════
// The composed SDK surface
// ═══════════════════════════════════════════════════════════════════════════

/** The concrete dependencies the {@link FoundationSdk} composes. */
export interface FoundationSdkParts {
  auth: AuthApi;
  profile: ProfileApi;
  audio: AudioApi;
  ai: AiApi;
  capture: AudioCapture;
  outbox: OfflineOutbox;
  locale: LocaleController;
}

/**
 * The single typed Foundation surface the app shell builds on. Every app
 * data/auth/storage/AI/i18n operation goes through one of these members — there
 * are no direct external calls anywhere in the app (Req 1.3, 1.4).
 */
export class FoundationSdk {
  readonly auth: AuthApi;
  readonly profile: ProfileApi;
  readonly audio: AudioApi;
  readonly ai: AiApi;
  readonly capture: AudioCapture;
  readonly outbox: OfflineOutbox;
  readonly locale: LocaleController;

  constructor(parts: FoundationSdkParts) {
    this.auth = parts.auth;
    this.profile = parts.profile;
    this.audio = parts.audio;
    this.ai = parts.ai;
    this.capture = parts.capture;
    this.outbox = parts.outbox;
    this.locale = parts.locale;
  }

  /** True iff `link` is a Telegram funnel claim deep link. */
  isClaimLink(link: string): boolean {
    return isClaimLink(link);
  }

  /** Extract the claim token from an inbound deep link, or `null` (design §3.1). */
  parseClaimToken(link: string): string | null {
    return extractClaimToken(link);
  }

  /**
   * Complete Telegram funnel entry (design §3.1): create the account, then
   * redeem the claim so the profile is bootstrapped with the carried tier /
   * region / Telegram id (Req 6.3). Routes entirely through {@link AuthApi}.
   */
  async completeFunnelEntry(params: FunnelEntryParams): Promise<LearnerProfile> {
    return signUpAndRedeemClaim(this.auth, params);
  }

  /** Redeem a claim for an already-authenticated learner (Req 6.3). */
  async redeemClaim(token: string, userId: UUID): Promise<LearnerProfile> {
    return this.auth.redeemFunnelClaim(token, userId);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Production composition pieces (wired only by createFoundationSdk)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Production {@link LocalePersistPort}: persists the chosen `uiLocale` to the
 * Learner Profile via {@link ProfileApi} (Req 2.3). The group-10 locale
 * controller left this for final wiring; it resolves the authenticated learner
 * from {@link AuthApi} (no user-id is carried on the persist call) and delegates
 * to {@link ProfileApi.updateLocale}. It throws when there is no session, so the
 * controller treats the switch as a failed persist and rolls back (Req 2.4).
 */
export class ProfileLocalePersistPort implements LocalePersistPort {
  constructor(
    private readonly auth: AuthApi,
    private readonly profile: ProfileApi,
  ) {}

  async persist(locale: UiLocale): Promise<void> {
    const session = await this.auth.getSession();
    if (!session) {
      throw new Error('Cannot persist the interface locale: no authenticated session.');
    }
    await this.profile.updateLocale(session.userId, locale);
  }
}

/**
 * Production {@link RecordingUploader}: uploads a queued recording's local bytes
 * through an {@link AudioApi} signed upload URL (design §3.2/§3.3). The owning
 * learner is resolved from the session; the recording id is derived from the
 * job's storage path so the upload lands under `recordings/{userId}/`.
 */
export class BackendRecordingUploader implements RecordingUploader {
  constructor(
    private readonly audio: AudioApi,
    private readonly auth: AuthApi,
  ) {}

  async upload(job: EvaluationJob): Promise<void> {
    const session = await this.auth.getSession();
    if (!session) {
      throw new Error('Cannot upload recording: no authenticated session.');
    }
    const recordingId = recordingIdFromPath(job.meta.audioStoragePath);
    const { url } = await this.audio.getUploadUrl(session.userId, recordingId);
    const local = await fetch(job.localUri);
    const body = await local.blob();
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'content-type': 'audio/m4a' },
      body,
    });
    if (!res.ok) {
      throw new Error(`Recording upload failed with status ${res.status}.`);
    }
  }
}

/**
 * Production {@link EvaluationSubmitter}: submits an uploaded recording for
 * assessment through the {@link AiApi} (which routes server-side via the
 * `ai-router` Edge Function). Returns the evaluated recording id.
 */
export class AiEvaluationSubmitter implements EvaluationSubmitter {
  constructor(private readonly ai: AiApi) {}

  async submit(job: EvaluationJob): Promise<{ recordingId: UUID }> {
    const { recordingId } = await this.ai.assessPronunciation(job.meta);
    return { recordingId };
  }
}

/**
 * Runtime connectivity probe. Uses the platform `navigator.onLine` flag when
 * available (web / React Native with a polyfill), defaulting to online so a
 * missing signal never wedges the Outbox.
 */
export function createRuntimeConnectivity(): ConnectivityPort {
  return {
    isOnline(): boolean {
      const nav = (globalThis as { navigator?: { onLine?: boolean } }).navigator;
      return nav?.onLine ?? true;
    },
  };
}

/** Best-effort seed of the initial interface locale from the signed-in profile. */
async function resolveInitialLocale(auth: AuthApi, profile: ProfileApi): Promise<UiLocale> {
  try {
    const session = await auth.getSession();
    if (!session) return 'ar';
    const learner = await profile.get(session.userId);
    return learner.uiLocale;
  } catch {
    // No session / no profile yet → Arabic-first default (Req 2.1).
    return 'ar';
  }
}

/**
 * Lazily wire the PRODUCTION Foundation SDK over the shared backend client.
 *
 * All heavy/runtime-only modules (Supabase auth port, expo-av recorder,
 * AsyncStorage outbox store, i18next runtime adapter) are reached through the
 * existing lazy `create*` factories, so this composition stays free of eager
 * native imports. A single {@link ProfileApi} instance is shared by the auth
 * bootstrap, the locale persister, and direct reads, so the whole app sees one
 * consistent Layer 0 surface.
 */
export async function createFoundationSdk(): Promise<FoundationSdk> {
  const client = getBackendClient();

  // One shared ProfileApi instance across auth bootstrap + reads + locale.
  const profile = await createProfileApi();

  const [{ SupabaseAuthPort }, { EdgeFunnelRedeemer }] = await Promise.all([
    import('./auth/supabaseAuthPort'),
    import('./funnel/edgeFunnelRedeemer'),
  ]);
  const auth = new AuthApi(new SupabaseAuthPort(client), profile, {
    claimRedeemer: new EdgeFunnelRedeemer(client),
  });

  const audio = await createAudioApi();
  const ai: AiApi = new EdgeAiApi(client);
  const capture = await createAudioCapture();

  const outbox = await createOutbox({
    uploader: new BackendRecordingUploader(audio, auth),
    submitter: new AiEvaluationSubmitter(ai),
    connectivity: createRuntimeConnectivity(),
  });

  const persister = new ProfileLocalePersistPort(auth, profile);
  const initialLocale = await resolveInitialLocale(auth, profile);
  const locale = await createLocaleController(persister, { initialLocale });
  await locale.applyInitialDirection();

  return new FoundationSdk({ auth, profile, audio, ai, capture, outbox, locale });
}
