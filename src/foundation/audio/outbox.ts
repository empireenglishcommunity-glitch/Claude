/**
 * Offline Outbox + low-data mode (Task 10.3).
 *
 * Realizes the design §6 {@link Outbox} contract (`enqueue` / `flush` /
 * `pending`) for the §3.3 offline-resilient pipeline. It is the durability
 * backbone of Requirement 10:
 *
 *   • While offline, evaluation jobs are enqueued in a PERSISTED "pending" state
 *     rather than failing (Req 10.3).
 *   • When connectivity returns, `flush` drains pending jobs in FIFO order,
 *     uploading the recording then submitting the evaluation, updates each job's
 *     outcome state, and reconciles the UI within 2s via `onReconcile` (Req 10.4).
 *   • Every accepted recording is ALWAYS in exactly one observable state —
 *     `pending`, `evaluated`, or `failed` — and is never removed before reaching
 *     success or an explicit `dismiss` (Req 10.5, design §9 Property 10).
 *   • A mid-transfer upload failure retries up to {@link MAX_UPLOAD_ATTEMPTS}
 *     times with increasing back-off, then moves the job to a terminal `failed`
 *     state with a manual `retry` option (Req 10.7).
 *
 * Plus the low-data-mode POLICY (Req 10.6): defer non-essential downloads,
 * prefer cache, and restrict network use to active uploads/submissions.
 *
 * ── Testability decision ────────────────────────────────────────────────────
 * Everything that touches the outside world is an injectable port — the durable
 * {@link OutboxStore} (in-memory fake in tests, AsyncStorage adapter in prod),
 * the {@link RecordingUploader} (AudioApi), the {@link EvaluationSubmitter}
 * (AiApi), a {@link ConnectivityPort}, and the back-off `sleep` — so the full
 * state machine runs offline and deterministically (Property 10 / Task 10.4).
 */
import type { EvaluationJob, ISODateTime, UUID } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// Observable job state (Req 10.5) — exactly one at all times
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The single observable state of an accepted recording's evaluation job:
 *   • `pending`   — queued/awaiting a successful flush (incl. retryable failures);
 *   • `evaluated` — assessed successfully (terminal success);
 *   • `failed`    — terminal failure WITH a learner-visible indication + manual
 *                   retry (Req 10.7).
 */
export type OutboxJobState = 'pending' | 'evaluated' | 'failed';

/** A persisted Outbox entry — the durable record of one evaluation job. */
export interface OutboxEntry {
  job: EvaluationJob;
  state: OutboxJobState;
  /** Number of upload attempts consumed so far (Req 10.7 cap). */
  attempts: number;
  /** Last error indication (for the `failed` state UI), if any. */
  lastError: string | null;
  /** The evaluated recording id once `state === 'evaluated'`. */
  recordingId: UUID | null;
  /** Last time this entry's state/attempts changed. */
  updatedAt: ISODateTime;
}

// ═══════════════════════════════════════════════════════════════════════════
// Config
// ═══════════════════════════════════════════════════════════════════════════

/** Max upload attempts before a job becomes terminally `failed` (Req 10.7). */
export const MAX_UPLOAD_ATTEMPTS = 5;

/** Base back-off in ms; attempt N waits `base × 2^(N-1)` (increasing, Req 10.7). */
export const BASE_BACKOFF_MS = 500;

/** Increasing back-off delay for the Nth upload attempt (1-based). */
export function computeBackoffMs(attempt: number, baseMs: number = BASE_BACKOFF_MS): number {
  const n = Math.max(1, Math.floor(attempt));
  return baseMs * 2 ** (n - 1);
}

// ═══════════════════════════════════════════════════════════════════════════
// Injectable ports
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Durable persistence for Outbox entries. Implementations MUST preserve
 * insertion (FIFO) order in `list()`. In-memory fake in tests; AsyncStorage
 * adapter in production (`asyncStorageOutboxStore.ts`).
 */
export interface OutboxStore {
  list(): Promise<OutboxEntry[]>;
  get(jobId: UUID): Promise<OutboxEntry | null>;
  upsert(entry: OutboxEntry): Promise<void>;
  remove(jobId: UUID): Promise<void>;
}

/** Uploads a job's local recording to storage. Throws on a mid-transfer failure. */
export interface RecordingUploader {
  upload(job: EvaluationJob): Promise<void>;
}

/** Submits an uploaded recording for evaluation; returns the evaluated recording id. */
export interface EvaluationSubmitter {
  submit(job: EvaluationJob): Promise<{ recordingId: UUID }>;
}

/** Reports current connectivity (Req 10.3/10.4). */
export interface ConnectivityPort {
  isOnline(): boolean | Promise<boolean>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Low-data mode policy (Req 10.6)
// ═══════════════════════════════════════════════════════════════════════════

/** Whether a download is required for the CURRENT screen or is deferrable. */
export type DownloadKind = 'essential' | 'non-essential';
/** The intent behind a network request. */
export type NetworkPurpose = 'upload' | 'submission' | 'other';

/**
 * The low-data-mode policy (Req 10.6). When enabled it defers non-essential
 * downloads, prefers cached content, and restricts network use to active
 * uploads/submissions. Pure + immutable so it is trivially testable and safe to
 * share.
 */
export interface LowDataPolicy {
  readonly enabled: boolean;
  /** Whether a download of the given kind may proceed now. */
  shouldDownload(kind: DownloadKind): boolean;
  /** Whether cached content should be preferred over the network. */
  preferCache(): boolean;
  /** Whether a network request for the given purpose is permitted. */
  allowsNetwork(purpose: NetworkPurpose): boolean;
}

/** Build a {@link LowDataPolicy} for the given mode (Req 10.6). */
export function createLowDataPolicy(enabled: boolean): LowDataPolicy {
  return Object.freeze({
    enabled,
    shouldDownload(kind: DownloadKind): boolean {
      // Low-data → only what the current screen needs; otherwise anything.
      return enabled ? kind === 'essential' : true;
    },
    preferCache(): boolean {
      return enabled;
    },
    allowsNetwork(purpose: NetworkPurpose): boolean {
      // Low-data → restrict to active uploads/submissions only.
      return enabled ? purpose === 'upload' || purpose === 'submission' : true;
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

/** True iff an error is a retryable transient (e.g. `AiUnavailableError`). */
function isRetryableError(err: unknown): boolean {
  return !!err && typeof err === 'object' && (err as { retryable?: unknown }).retryable === true;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

// ═══════════════════════════════════════════════════════════════════════════
// The Outbox
// ═══════════════════════════════════════════════════════════════════════════

export interface OutboxDeps {
  store: OutboxStore;
  uploader: RecordingUploader;
  submitter: EvaluationSubmitter;
  connectivity: ConnectivityPort;
  /** Called after a flush so the UI reconciles within 2s (Req 10.4). */
  onReconcile?: (entries: OutboxEntry[]) => void;
  /** Injectable wall clock (ISO) for `updatedAt`. */
  now?: () => ISODateTime;
  /** Injectable back-off sleep (tests pass a no-op). */
  sleep?: (ms: number) => Promise<void>;
  /** Override the max upload attempts (tests). Default {@link MAX_UPLOAD_ATTEMPTS}. */
  maxUploadAttempts?: number;
  /** Override the base back-off ms (tests). Default {@link BASE_BACKOFF_MS}. */
  baseBackoffMs?: number;
}

/** Summary of a {@link OfflineOutbox.flush} run (for callers/tests). */
export interface FlushReport {
  online: boolean;
  processed: number;
  evaluated: number;
  failed: number;
  stillPending: number;
}

/**
 * Requirement-faithful realization of the design §6 {@link Outbox}. See the file
 * header for the Requirement-10 guarantees it upholds.
 */
export class OfflineOutbox {
  private readonly store: OutboxStore;
  private readonly uploader: RecordingUploader;
  private readonly submitter: EvaluationSubmitter;
  private readonly connectivity: ConnectivityPort;
  private readonly onReconcile?: (entries: OutboxEntry[]) => void;
  private readonly now: () => ISODateTime;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly maxAttempts: number;
  private readonly baseBackoffMs: number;

  constructor(deps: OutboxDeps) {
    this.store = deps.store;
    this.uploader = deps.uploader;
    this.submitter = deps.submitter;
    this.connectivity = deps.connectivity;
    this.onReconcile = deps.onReconcile;
    this.now = deps.now ?? (() => new Date().toISOString());
    this.sleep = deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.maxAttempts = deps.maxUploadAttempts ?? MAX_UPLOAD_ATTEMPTS;
    this.baseBackoffMs = deps.baseBackoffMs ?? BASE_BACKOFF_MS;
  }

  /**
   * Enqueue an evaluation job in a persisted `pending` state (Req 10.3). The job
   * is durably recorded BEFORE any upload, so it survives an offline app close.
   * Idempotent on job id (re-enqueue of the same id refreshes the pending entry).
   */
  async enqueue(job: EvaluationJob): Promise<void> {
    const existing = await this.store.get(job.id);
    const entry: OutboxEntry = {
      job,
      state: 'pending',
      attempts: existing?.attempts ?? 0,
      lastError: null,
      recordingId: null,
      updatedAt: this.now(),
    };
    await this.store.upsert(entry);
  }

  /** The jobs still awaiting a successful flush (Req 10.3, design §6). */
  async pending(): Promise<EvaluationJob[]> {
    const entries = await this.store.list();
    return entries.filter((e) => e.state === 'pending').map((e) => e.job);
  }

  /** All persisted entries (observability — every job is in exactly one state). */
  async entries(): Promise<OutboxEntry[]> {
    return this.store.list();
  }

  /**
   * Drain pending jobs in FIFO order when online (Req 10.4). When offline this
   * is a no-op and jobs remain `pending` (Req 10.3) — nothing is ever failed for
   * being offline. After processing, `onReconcile` fires so the UI updates
   * within 2s (Req 10.4).
   */
  async flush(): Promise<FlushReport> {
    const online = await this.connectivity.isOnline();
    if (!online) {
      const all = await this.store.list();
      return {
        online: false,
        processed: 0,
        evaluated: 0,
        failed: 0,
        stillPending: all.filter((e) => e.state === 'pending').length,
      };
    }

    // FIFO: list() preserves insertion order; process only pending entries.
    const pendingEntries = (await this.store.list()).filter((e) => e.state === 'pending');
    let evaluated = 0;
    let failed = 0;
    for (const entry of pendingEntries) {
      const result = await this.processEntry(entry);
      if (result === 'evaluated') evaluated += 1;
      else if (result === 'failed') failed += 1;
    }

    const after = await this.store.list();
    this.onReconcile?.(after);
    return {
      online: true,
      processed: pendingEntries.length,
      evaluated,
      failed,
      stillPending: after.filter((e) => e.state === 'pending').length,
    };
  }

  /**
   * Manually retry a terminally `failed` job (Req 10.7 — manual retry option):
   * resets it to `pending` with a clean attempt counter so the next flush
   * reprocesses it. No-op for jobs that are not currently `failed`.
   */
  async retry(jobId: UUID): Promise<void> {
    const entry = await this.store.get(jobId);
    if (!entry || entry.state !== 'failed') return;
    await this.store.upsert({
      ...entry,
      state: 'pending',
      attempts: 0,
      lastError: null,
      updatedAt: this.now(),
    });
  }

  /**
   * Explicitly dismiss a job (the ONLY way a job leaves the Outbox short of a
   * successful evaluation — Req 10.5). Removes it from the durable store.
   */
  async dismiss(jobId: UUID): Promise<void> {
    await this.store.remove(jobId);
  }

  // ── internals ──────────────────────────────────────────────────────────────

  /**
   * Process one pending entry: upload (with bounded increasing-back-off retries,
   * Req 10.7), then submit. Returns the resulting terminal/intermediate state.
   */
  private async processEntry(entry: OutboxEntry): Promise<OutboxJobState> {
    // Defensive: an entry already at the attempt cap is terminal.
    if (entry.attempts >= this.maxAttempts) {
      return this.persist(entry, 'failed', entry.attempts, entry.lastError ?? 'Upload failed.');
    }

    // 1. Upload with bounded retries (Req 10.7).
    let attempts = entry.attempts;
    while (attempts < this.maxAttempts) {
      try {
        await this.uploader.upload(entry.job);
        break; // uploaded
      } catch (err) {
        attempts += 1;
        if (attempts >= this.maxAttempts) {
          // Exhausted attempts → terminal failed with a manual-retry indication.
          return this.persist(entry, 'failed', attempts, errorMessage(err));
        }
        // Keep pending, record the attempt, then wait an increasing back-off.
        await this.persist(entry, 'pending', attempts, errorMessage(err));
        await this.sleep(computeBackoffMs(attempts, this.baseBackoffMs));
      }
    }

    // 2. Submit the evaluation.
    try {
      const { recordingId } = await this.submitter.submit(entry.job);
      const next: OutboxEntry = {
        ...entry,
        state: 'evaluated',
        attempts,
        lastError: null,
        recordingId,
        updatedAt: this.now(),
      };
      await this.store.upsert(next);
      return 'evaluated';
    } catch (err) {
      if (isRetryableError(err)) {
        // Transient (e.g. AI provider unavailable) → stay pending, retry later
        // (Req 8.7). The recording is never lost.
        return this.persist(entry, 'pending', attempts, errorMessage(err));
      }
      // Non-retryable (e.g. allowance exceeded) → terminal failed w/ indication.
      return this.persist(entry, 'failed', attempts, errorMessage(err));
    }
  }

  /** Persist an entry at a new state/attempts/error and return that state. */
  private async persist(
    entry: OutboxEntry,
    state: OutboxJobState,
    attempts: number,
    lastError: string | null,
  ): Promise<OutboxJobState> {
    await this.store.upsert({
      ...entry,
      state,
      attempts,
      lastError,
      updatedAt: this.now(),
    });
    return state;
  }
}

/**
 * Construct the production Outbox backed by AsyncStorage + the Audio/AI SDKs.
 * Imported LAZILY so offline tests that inject fakes never pull AsyncStorage or
 * the backend client into their import graph (mirrors `createAudioApi`).
 */
export async function createOutbox(
  deps: {
    uploader: RecordingUploader;
    submitter: EvaluationSubmitter;
    connectivity: ConnectivityPort;
    onReconcile?: (entries: OutboxEntry[]) => void;
    storageKey?: string;
  },
): Promise<OfflineOutbox> {
  const { AsyncStorageOutboxStore } = await import('./asyncStorageOutboxStore');
  const store = new AsyncStorageOutboxStore(deps.storageKey);
  return new OfflineOutbox({
    store,
    uploader: deps.uploader,
    submitter: deps.submitter,
    connectivity: deps.connectivity,
    onReconcile: deps.onReconcile,
  });
}
