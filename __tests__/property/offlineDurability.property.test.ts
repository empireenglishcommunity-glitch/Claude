/**
 * Property 10 — Offline durability (Project P1, Task 10.4).
 *
 * **Validates: Requirements 8.7, 10.5, 10.7**
 *
 * For any recording accepted by audio capture (modelled as an enqueued
 * {@link EvaluationJob}), across ARBITRARY sequences of online/offline toggles
 * and upload/submit successes & failures, the job is NEVER silently lost: it
 * always remains in the Outbox in EXACTLY ONE observable state — `pending`,
 * `evaluated`, or `failed` — and is removed only by an explicit dismissal
 * (which this model never performs). Mid-upload failures retry up to 5 attempts
 * with increasing back-off, then settle into a terminal `failed` state with a
 * manual-retry option.
 *
 * Library: fast-check (≥100 iterations).
 */
import fc from 'fast-check';
import {
  OfflineOutbox,
  type ConnectivityPort,
  type EvaluationSubmitter,
  type OutboxJobState,
  type RecordingUploader,
} from '../../src/foundation/audio/outbox';
import type { EvaluationJob, UUID } from '../../src/foundation/types';
import { InMemoryOutboxStore } from '../helpers/inMemoryOutboxStore';

const RUNS = { numRuns: 200 } as const;
const VALID_STATES: ReadonlySet<OutboxJobState> = new Set(['pending', 'evaluated', 'failed']);

// ── Scriptable side-effect doubles ──────────────────────────────────────────

class ScriptedUploader implements RecordingUploader {
  fail = false;
  async upload(_job: EvaluationJob): Promise<void> {
    if (this.fail) throw new Error('mid-transfer upload failure');
  }
}

type SubmitMode = 'ok' | 'retryable' | 'fatal';

class ScriptedSubmitter implements EvaluationSubmitter {
  mode: SubmitMode = 'ok';
  async submit(job: EvaluationJob): Promise<{ recordingId: UUID }> {
    if (this.mode === 'retryable') {
      const err = new Error('AI engine unavailable') as Error & { retryable: boolean };
      err.retryable = true; // mirrors AiUnavailableError
      throw err;
    }
    if (this.mode === 'fatal') {
      const err = new Error('allowance exceeded') as Error & { retryable: boolean };
      err.retryable = false; // mirrors AllowanceExceededError
      throw err;
    }
    return { recordingId: job.id };
  }
}

class MutableConnectivity implements ConnectivityPort {
  online = true;
  isOnline(): boolean {
    return this.online;
  }
}

// ── Arbitraries ──────────────────────────────────────────────────────────────

const jobArb: fc.Arbitrary<EvaluationJob> = fc.record({
  id: fc.uuid(),
  localUri: fc.constant('file:///rec.m4a'),
  meta: fc.record({
    audioStoragePath: fc.constant('recordings/u/rec.m4a'),
    referenceText: fc.string({ minLength: 1, maxLength: 12 }),
  }),
  enqueuedAt: fc.constant('2026-06-17T00:00:00.000Z'),
});

const stepArb = fc.record({
  online: fc.boolean(),
  uploadFails: fc.boolean(),
  submit: fc.constantFrom<SubmitMode>('ok', 'retryable', 'fatal'),
  doFlush: fc.boolean(),
});

describe('Property 10: Offline durability (Req 8.7, 10.5, 10.7)', () => {
  it('every accepted recording stays in exactly one of pending|evaluated|failed and is never lost', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(jobArb, { minLength: 1, maxLength: 5 }),
        fc.array(stepArb, { maxLength: 16 }),
        async (rawJobs, steps) => {
          // Deduplicate by id so each recording is enqueued exactly once.
          const jobs = Array.from(new Map(rawJobs.map((j) => [j.id, j])).values());

          const store = new InMemoryOutboxStore();
          const uploader = new ScriptedUploader();
          const submitter = new ScriptedSubmitter();
          const connectivity = new MutableConnectivity();
          const outbox = new OfflineOutbox({
            store,
            uploader,
            submitter,
            connectivity,
            now: () => '2026-06-17T00:00:00.000Z',
            sleep: async () => {}, // no real back-off delay in tests
            baseBackoffMs: 1,
          });

          for (const job of jobs) await outbox.enqueue(job);

          for (const step of steps) {
            connectivity.online = step.online;
            uploader.fail = step.uploadFails;
            submitter.mode = step.submit;
            if (step.doFlush) await outbox.flush();
          }

          const entries = await outbox.entries();

          // 1. Nothing was silently lost: every enqueued job is still present...
          if (entries.length !== jobs.length) return false;
          for (const job of jobs) {
            const entry = entries.find((e) => e.job.id === job.id);
            if (!entry) return false;
            // 2. ...in EXACTLY ONE valid observable state.
            if (!VALID_STATES.has(entry.state)) return false;
            // 3. An evaluated job carries its recording id; failed carries an indication.
            if (entry.state === 'evaluated' && entry.recordingId !== job.id) return false;
            if (entry.state === 'failed' && !entry.lastError) return false;
            // 4. Attempts never exceed the cap (Req 10.7).
            if (entry.attempts > 5) return false;
          }
          return true;
        },
      ),
      RUNS,
    );
  });

  it('a persistent mid-upload failure settles into terminal failed after 5 attempts, then manual retry recovers', async () => {
    const store = new InMemoryOutboxStore();
    const uploader = new ScriptedUploader();
    const submitter = new ScriptedSubmitter();
    const connectivity = new MutableConnectivity();
    const outbox = new OfflineOutbox({
      store,
      uploader,
      submitter,
      connectivity,
      sleep: async () => {},
      baseBackoffMs: 1,
    });

    const job: EvaluationJob = {
      id: 'job-1',
      localUri: 'file:///rec.m4a',
      meta: { audioStoragePath: 'recordings/u/rec.m4a', referenceText: 'hello' },
      enqueuedAt: '2026-06-17T00:00:00.000Z',
    };
    await outbox.enqueue(job);

    // Upload keeps failing → terminal failed after the attempt cap (Req 10.7).
    uploader.fail = true;
    await outbox.flush();
    let entry = (await outbox.entries())[0];
    expect(entry.state).toBe('failed');
    expect(entry.attempts).toBe(5);
    expect(entry.lastError).toBeTruthy();

    // Manual retry → back to pending; now uploads + submits succeed → evaluated.
    await outbox.retry('job-1');
    expect((await outbox.entries())[0].state).toBe('pending');
    uploader.fail = false;
    await outbox.flush();
    entry = (await outbox.entries())[0];
    expect(entry.state).toBe('evaluated');
    expect(entry.recordingId).toBe('job-1');
  });

  it('while offline, jobs remain pending and are never failed for being offline (Req 10.3)', async () => {
    const store = new InMemoryOutboxStore();
    const connectivity = new MutableConnectivity();
    const outbox = new OfflineOutbox({
      store,
      uploader: new ScriptedUploader(),
      submitter: new ScriptedSubmitter(),
      connectivity,
      sleep: async () => {},
    });

    await outbox.enqueue({
      id: 'job-offline',
      localUri: 'file:///rec.m4a',
      meta: { audioStoragePath: 'recordings/u/rec.m4a', referenceText: 'hi' },
      enqueuedAt: '2026-06-17T00:00:00.000Z',
    });

    connectivity.online = false;
    const report = await outbox.flush();
    expect(report.online).toBe(false);
    expect((await outbox.pending())).toHaveLength(1);
    expect((await outbox.entries())[0].state).toBe('pending');
  });
});
