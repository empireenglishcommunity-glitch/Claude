/**
 * AsyncStorage-backed {@link OutboxStore} (Task 10.3).
 *
 * ⚠️ This is the ONLY Outbox module that touches
 * `@react-native-async-storage/async-storage`. It is imported LAZILY (only by
 * `createOutbox`) so offline unit/property tests — which inject an in-memory
 * store fake — never pull AsyncStorage into their import graph (mirrors
 * `supabaseAudioStore` / `expoAvRecorder`).
 *
 * The whole queue is persisted as a single JSON array under one key, which
 * preserves FIFO insertion order (the contract `OfflineOutbox.flush` relies on)
 * and makes the durable "pending while offline" guarantee survive app restarts
 * (Req 10.3/10.5). For P1's volumes (a handful of queued recordings) a single
 * blob is simpler and sufficient; sharding can come later if needed.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UUID } from '../types';
import type { OutboxEntry, OutboxStore } from './outbox';

/** Default AsyncStorage key the queue is persisted under. */
export const DEFAULT_OUTBOX_KEY = 'empire.outbox.v1';

export class AsyncStorageOutboxStore implements OutboxStore {
  private readonly key: string;

  constructor(key: string = DEFAULT_OUTBOX_KEY) {
    this.key = key;
  }

  private async readAll(): Promise<OutboxEntry[]> {
    const raw = await AsyncStorage.getItem(this.key);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as OutboxEntry[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private async writeAll(entries: OutboxEntry[]): Promise<void> {
    await AsyncStorage.setItem(this.key, JSON.stringify(entries));
  }

  async list(): Promise<OutboxEntry[]> {
    return this.readAll();
  }

  async get(jobId: UUID): Promise<OutboxEntry | null> {
    const all = await this.readAll();
    return all.find((e) => e.job.id === jobId) ?? null;
  }

  async upsert(entry: OutboxEntry): Promise<void> {
    const all = await this.readAll();
    const idx = all.findIndex((e) => e.job.id === entry.job.id);
    if (idx === -1) {
      all.push(entry); // append → preserve FIFO order
    } else {
      all[idx] = entry; // update in place → keep position
    }
    await this.writeAll(all);
  }

  async remove(jobId: UUID): Promise<void> {
    const all = await this.readAll();
    await this.writeAll(all.filter((e) => e.job.id !== jobId));
  }
}
