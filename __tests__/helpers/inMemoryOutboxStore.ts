/**
 * In-memory {@link OutboxStore} fake for deterministic, offline tests.
 *
 * This is NOT a test file (no `.test.ts` suffix, so Jest's `testMatch` ignores
 * it). It lets the Outbox (Task 10.3) run fully offline — no AsyncStorage — for
 * the offline-durability property test (10.4). It preserves FIFO insertion order
 * (the contract `OfflineOutbox.flush` relies on) exactly like the AsyncStorage
 * adapter does.
 */
import type { OutboxEntry, OutboxStore } from '../../src/foundation/audio/outbox';
import type { UUID } from '../../src/foundation/types';

export class InMemoryOutboxStore implements OutboxStore {
  /** Ordered list of entries (FIFO by first insertion). */
  private readonly entries: OutboxEntry[] = [];

  async list(): Promise<OutboxEntry[]> {
    // Return copies so callers cannot mutate stored state directly.
    return this.entries.map((e) => ({ ...e }));
  }

  async get(jobId: UUID): Promise<OutboxEntry | null> {
    const found = this.entries.find((e) => e.job.id === jobId);
    return found ? { ...found } : null;
  }

  async upsert(entry: OutboxEntry): Promise<void> {
    const idx = this.entries.findIndex((e) => e.job.id === entry.job.id);
    if (idx === -1) {
      this.entries.push({ ...entry });
    } else {
      this.entries[idx] = { ...entry };
    }
  }

  async remove(jobId: UUID): Promise<void> {
    const idx = this.entries.findIndex((e) => e.job.id === jobId);
    if (idx !== -1) this.entries.splice(idx, 1);
  }

  /** Test helper: synchronous snapshot of current entries. */
  snapshot(): OutboxEntry[] {
    return this.entries.map((e) => ({ ...e }));
  }
}
