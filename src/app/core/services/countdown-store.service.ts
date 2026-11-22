import { Injectable, computed, signal } from '@angular/core';
import {
  Countdown,
  CountdownCategory,
  CountdownStatus,
  CreateCountdownInput,
} from '../../domain/models/countdown.model';
import { Milestone } from '../../domain/models/milestone.model';
import { CountdownFactoryService } from './countdown-factory.service';
import { MilestonePlannerService } from './milestone-planner.service';
import { inject } from '@angular/core';
import { COUNTDOWN_REPOSITORY, isCountdownRecord } from './countdown-repository';
import { AuthSessionService } from './auth-session.service';
import { SyncQueueService } from './sync-queue.service';

const STORAGE_KEY = 't-minus.countdowns.v1';

function readFromStorage(): Countdown[] {
  if (typeof localStorage === 'undefined') {
    return [];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isCountdownRecord) : [];
  } catch {
    return [];
  }
}

function writeToStorage(countdowns: Countdown[]): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(countdowns));
  } catch {
    // Storage can be unavailable (private mode, quota exceeded); the in-memory
    // signal remains the source of truth for the current session either way.
  }
}

/**
 * Client-side state for countdowns, backed by the repository with legacy storage fallback.
 *
 * This is a thin repository sitting in front of the pure domain services
 * (`CountdownFactoryService`, `MilestonePlannerService`): it owns the signal
 * holding the current list and persists every mutation, so the UI always
 * reads/writes real data instead of mocks. A future cloud-sync repository can
 * replace the storage functions above without touching call sites, since
 * every public method here already returns/accepts plain `Countdown` objects.
 */
@Injectable({ providedIn: 'root' })
export class CountdownStoreService {
  private readonly factory = inject(CountdownFactoryService);
  private readonly milestonePlanner = inject(MilestonePlannerService);
  private readonly repository = inject(COUNTDOWN_REPOSITORY);
  private readonly auth = inject(AuthSessionService);
  private readonly syncQueue = inject(SyncQueueService);

  private readonly _countdowns = signal<Countdown[]>(readFromStorage());
  private readonly _loaded = signal(true);
  private writeQueue: Promise<void> = Promise.resolve();
  private mutationVersion = 0;
  private lastPersisted = new Map(readFromStorage().map((countdown) => [countdown.id, countdown]));

  constructor() {
    const legacy = readFromStorage();
    if (typeof indexedDB === 'undefined') return;
    this._loaded.set(false);
    const startupVersion = this.mutationVersion;
    void this.repository.load().then(async (saved) => {
      if (this.mutationVersion !== startupVersion) {
        await this.repository.saveAll(this._countdowns());
        return;
      }
      const current = saved.length ? saved : legacy;
      if (!saved.length && legacy.length) {
        await this.repository.saveAll(legacy);
        try { localStorage.removeItem(STORAGE_KEY); } catch { /* Retain data if browser storage is restricted. */ }
      }
      this._countdowns.set(current);
      this.lastPersisted = new Map(current.map((countdown) => [countdown.id, countdown]));
    }).catch(() => {
      // Keep the validated localStorage snapshot available if IndexedDB fails.
    }).finally(() => this._loaded.set(true));
  }

  readonly countdowns = this._countdowns.asReadonly();
  readonly loaded = this._loaded.asReadonly();

  readonly total = computed(() => this._countdowns().length);
  readonly active = computed(() => this._countdowns().filter((c) => c.status === 'active'));
  readonly archived = computed(() => this._countdowns().filter((c) => c.status === 'archived'));
  readonly paused = computed(() => this._countdowns().filter((c) => c.status === 'paused'));
  readonly completed = computed(() =>
    this._countdowns().filter((c) => new Date(c.targetDate).getTime() <= Date.now())
  );
  readonly upcoming = computed(() =>
    [...this.active()]
      .filter((c) => new Date(c.targetDate).getTime() > Date.now())
      .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())
  );
  readonly recentlyUpdated = computed(() =>
    [...this._countdowns()]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5)
  );

  byId(id: string): Countdown | undefined {
    return this._countdowns().find((c) => c.id === id);
  }

  applyRemoteVersion(value: unknown): void {
    if (!isCountdownRecord(value)) throw new Error('The remote countdown payload is invalid.');
    const current = this._countdowns();
    const next = current.some((item) => item.id === value.id)
      ? current.map((item) => item.id === value.id ? value : item)
      : [...current, value];
    this._countdowns.set(next);
    this.lastPersisted = new Map(next.map((countdown) => [countdown.id, countdown]));
    writeToStorage(next);
    this.writeQueue = this.writeQueue.then(() => this.repository.saveAll(next));
  }

  applyRemoteDeletion(id: string): void {
    const next = this._countdowns().filter((item) => item.id !== id);
    this._countdowns.set(next);
    this.lastPersisted = new Map(next.map((countdown) => [countdown.id, countdown]));
    writeToStorage(next);
    this.writeQueue = this.writeQueue.then(() => this.repository.saveAll(next));
  }

  import(countdowns: readonly Countdown[]): number {
    const known = new Set(this._countdowns().map((countdown) => countdown.id));
    const additions = countdowns.filter((countdown) => {
      if (!isCountdownRecord(countdown) || known.has(countdown.id)) return false;
      known.add(countdown.id);
      return true;
    });
    if (additions.length) {
      this._countdowns.update((current) => [...current, ...additions]);
      this.persist();
    }
    return additions.length;
  }

  create(input: CreateCountdownInput): Countdown {
    const countdown = this.factory.create(input);
    this._countdowns.update((list) => [...list, countdown]);
    this.persist();
    return countdown;
  }

  update(
    id: string,
    changes: Partial<
      Pick<Countdown, 'title' | 'description' | 'targetDate' | 'timeZone' | 'category'>
    >
  ): void {
    this.patch(id, (c) => ({ ...c, ...changes, updatedAt: new Date().toISOString() }));
  }

  remove(id: string): void {
    this._countdowns.update((list) => list.filter((c) => c.id !== id));
    this.persist();
  }

  duplicate(id: string): Countdown | undefined {
    const source = this.byId(id);
    if (!source) {
      return undefined;
    }
    const copy = this.factory.duplicate(source);
    this._countdowns.update((list) => [...list, copy]);
    this.persist();
    return copy;
  }

  setStatus(id: string, status: CountdownStatus): void {
    this.patch(id, (c) => ({ ...c, status, updatedAt: new Date().toISOString() }));
  }

  setCategory(id: string, category: CountdownCategory): void {
    this.patch(id, (c) => ({ ...c, category, updatedAt: new Date().toISOString() }));
  }

  addMilestone(id: string, input: { title: string; date: string; description?: string }): void {
    this.patch(id, (c) => ({
      ...c,
      milestones: this.milestonePlanner.addCustomMilestone(
        c.milestones,
        c.id,
        c.targetDate,
        input
      ),
      updatedAt: new Date().toISOString(),
    }));
  }

  removeMilestone(id: string, milestoneId: string): void {
    this.patch(id, (c) => ({
      ...c,
      milestones: this.milestonePlanner.removeMilestone(c.milestones, milestoneId),
      updatedAt: new Date().toISOString(),
    }));
  }

  setMilestoneDone(id: string, milestoneId: string, done: boolean): void {
    this.patch(id, (c) => ({
      ...c,
      milestones: this.milestonePlanner.setMilestoneDone(c.milestones, milestoneId, done),
      updatedAt: new Date().toISOString(),
    }));
  }

  updateMilestone(
    id: string,
    milestoneId: string,
    changes: Partial<Pick<Milestone, 'title' | 'description' | 'date'>>
  ): void {
    this.patch(id, (c) => ({
      ...c,
      milestones: this.milestonePlanner.updateMilestone(c.milestones, c.targetDate, milestoneId, changes),
      updatedAt: new Date().toISOString(),
    }));
  }

  private patch(id: string, fn: (countdown: Countdown) => Countdown): void {
    this._countdowns.update((list) => list.map((c) => (c.id === id ? fn(c) : c)));
    this.persist();
  }

  private persist(): void {
    this.mutationVersion += 1;
    writeToStorage(this._countdowns());
    const snapshot = this._countdowns();
    if (this.auth.authenticated()) {
      const current = new Map(snapshot.map((countdown) => [countdown.id, countdown]));
      for (const [id, previous] of this.lastPersisted) {
        const next = current.get(id);
        if (!next) {
          void this.syncQueue.enqueue({ resourceId: id, entity: 'countdown', operation: 'delete', localRevision: new Date().toISOString(), baseUpdatedAt: previous.updatedAt }).catch(() => undefined);
        } else if (next !== previous) {
          void this.syncQueue.enqueue({ resourceId: id, entity: 'countdown', operation: 'upsert', payload: next, localRevision: next.updatedAt, baseUpdatedAt: previous.updatedAt }).catch(() => undefined);
        }
      }
      for (const [id, countdown] of current) {
        if (!this.lastPersisted.has(id)) void this.syncQueue.enqueue({ resourceId: id, entity: 'countdown', operation: 'upsert', payload: countdown, localRevision: countdown.updatedAt }).catch(() => undefined);
      }
    }
    this.lastPersisted = new Map(snapshot.map((countdown) => [countdown.id, countdown]));
    this.writeQueue = this.writeQueue.then(() => this.repository.saveAll(snapshot)).catch(() => {
      // The in-memory state and localStorage fallback remain available offline.
    });
  }
}
