import { Injectable, inject, Injector } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CLOUD_CONFIG } from './cloud-config';
import { Countdown } from '../../domain/models/countdown.model';

export type SyncOperation = 'upsert' | 'delete';
export type ConflictResolutionStatus = 'pending' | 'keep-local' | 'keep-remote' | 'manual-resolved';
export interface SyncConflict {
  id: string;
  resourceId: string;
  entity: SyncEntry['entity'];
  localPendingVersion?: unknown;
  remoteServerVersion?: unknown;
  localExpectedRevision?: number;
  currentServerRevision?: number;
  detectedAt: string;
  originalOperation: SyncOperation;
  idempotencyKey: string;
  resolutionStatus: ConflictResolutionStatus;
  remoteDeleted: boolean;
}
export interface SyncEntry {
  id: string; resourceId: string; entity: 'countdown' | 'milestone' | 'reminder'; operation: SyncOperation;
  payload?: unknown; baseUpdatedAt?: string; baseRevision?: number; allowRestore?: boolean; localRevision: string; serverRevision?: number | string;
  status: 'pending' | 'conflict' | 'failed' | 'synced'; retryCount: number; nextAttemptAt: number;
  lastError?: string; createdAt: string; syncedAt?: string; idempotencyKey?: string;
}

@Injectable({ providedIn: 'root' })
export class SyncQueueService {
  private readonly injector = inject(Injector);
  private readonly config = inject(CLOUD_CONFIG);
  private readonly dbName = 't-minus-countdown';
  private readonly storeName = 'sync-queue';
  private readonly conflictStoreName = 'sync-conflicts';
  private readonly stateStoreName = 'sync-state';
  private flushing?: Promise<void>;

  async enqueue(change: Omit<SyncEntry, 'id' | 'status' | 'retryCount' | 'nextAttemptAt' | 'createdAt'>): Promise<SyncEntry> {
    const records = (await this.list()).filter((item) => item.resourceId === change.resourceId);
    const queued = records.find((item) => item.status === 'pending' || item.status === 'conflict');
    if (queued) {
      const updated = { ...queued, ...change, id: queued.id, baseUpdatedAt: queued.baseUpdatedAt ?? (typeof queued.serverRevision === 'string' ? queued.serverRevision : undefined), baseRevision: typeof queued.serverRevision === 'number' ? queued.serverRevision : change.baseRevision, idempotencyKey: crypto.randomUUID(), status: 'pending' as const, retryCount: 0, nextAttemptAt: Date.now(), lastError: undefined };
      await this.put(updated);
      return updated;
    }
    const latestEntry = records.find((item) => item.status === 'synced' && typeof item.serverRevision === 'number');
    const latestRevision = typeof latestEntry?.serverRevision === 'number' ? latestEntry.serverRevision : undefined;
    const entry: SyncEntry = { ...change, baseRevision: latestRevision ?? change.baseRevision, id: crypto.randomUUID(), idempotencyKey: crypto.randomUUID(), status: 'pending', retryCount: 0, nextAttemptAt: Date.now(), createdAt: new Date().toISOString() };
    await this.put(entry);
    return entry;
  }

  async list(): Promise<SyncEntry[]> { return this.withStore('readonly', (store) => store.getAll()); }
  async listConflicts(): Promise<SyncConflict[]> { return this.withStore('readonly', (store) => store.getAll(), this.conflictStoreName); }

  async flush(): Promise<void> {
    if (this.flushing) return this.flushing;
    this.flushing = ('locks' in navigator)
      ? navigator.locks.request('t-minus-sync', { mode: 'exclusive' }, () => this.flushInternal())
      : this.flushInternal();
    this.flushing = this.flushing.finally(() => { this.flushing = undefined; });
    return this.flushing;
  }

  async recoverFailed(): Promise<void> {
    const entries = await this.list();
    await Promise.all(entries.filter((entry) => entry.status === 'failed').map((entry) =>
      this.put({ ...entry, status: 'pending', nextAttemptAt: Date.now(), lastError: undefined })));
  }

  private async flushInternal(): Promise<void> {
    if (!navigator.onLine || !this.config.apiUrl) return;
    const http = this.injector.get(HttpClient);
    const seen = new Set<string>();
    const pending = (await this.list())
      .filter((item) => item.status === 'pending' && item.nextAttemptAt <= Date.now())
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .filter((item) => !seen.has(item.resourceId) && seen.add(item.resourceId));
    for (const entry of pending) {
      try {
        const response = await firstValueFrom(http.post<{ results?: Array<{ id: string; status: string; code?: string; current?: { updatedAt?: string; revision?: number }; revision?: number }> }>(`${this.config.apiUrl}/api/sync`, {
          changes: [{ entity: entry.entity, id: entry.resourceId, operation: entry.operation, payload: entry.payload, baseUpdatedAt: entry.baseUpdatedAt, baseRevision: entry.baseRevision, allowRestore: entry.allowRestore }],
        }, { headers: { 'Idempotency-Key': entry.idempotencyKey ?? entry.id } }));
        const result = response.results?.find((item) => item.id === entry.resourceId);
        const conflict = result?.status === 'conflict' ? result : undefined;
        if (conflict) {
          await this.saveConflict(entry, conflict.current, conflict.current?.revision ?? conflict.revision, false, http);
          continue;
        }
        if (!result || !['created', 'updated', 'deleted'].includes(result.status)) throw new Error('The server did not acknowledge this operation.');
        const syncedAt = new Date().toISOString();
        await this.put({ ...entry, status: 'synced', serverRevision: result.revision, syncedAt, lastError: undefined });
        await this.withStore('readwrite', (store) => store.put({ id: 'last-success', at: syncedAt }), this.stateStoreName);
      } catch (error) {
        const status = error instanceof HttpErrorResponse ? error.status : 0;
        const conflict = status === 409;
        if (conflict) {
          await this.saveConflict(entry, undefined, undefined, false, http);
          continue;
        }
        const retryCount = entry.retryCount + 1;
        const exhausted = retryCount >= 8;
        const delay = Math.min(300_000, 1000 * (2 ** Math.min(retryCount, 8))) + Math.floor(Math.random() * 250);
        const updated: SyncEntry = { ...entry, status: conflict ? 'conflict' : 'pending', retryCount,
          nextAttemptAt: Date.now() + delay,
          lastError: status === 401 ? 'Authentication expired; sign in again to resume synchronization.' : `Synchronization failed${status ? ` (${status})` : ''}.` };
        if (exhausted) updated.status = 'failed';
        await this.put(updated);
      }
    }
  }

  async resolveConflict(id: string, resolution: 'keep-local' | 'keep-server' | 'keep-remote' | 'manual', payload?: unknown): Promise<void> {
    const entry = (await this.list()).find((item) => item.id === id);
    if (!entry || entry.status !== 'conflict') return;
    const conflict = (await this.listConflicts()).find((item) => item.id === id);
    if (!conflict) throw new Error('Conflict metadata is unavailable; refresh synchronization state before resolving it.');
    if (resolution === 'keep-remote' || resolution === 'keep-server') {
      if (conflict.remoteDeleted) {
        if (entry.entity !== 'countdown') throw new Error('Remote deletion requires an entity-specific local repository.');
        const store = this.injector.get((await import('./countdown-store.service')).CountdownStoreService);
        store.applyRemoteDeletion(entry.resourceId);
      } else if (entry.entity === 'countdown' && conflict.remoteServerVersion) {
        const store = this.injector.get((await import('./countdown-store.service')).CountdownStoreService);
        store.applyRemoteVersion(conflict.remoteServerVersion);
      } else {
        throw new Error('Remote resolution is not supported for this entity yet.');
      }
      await this.put({ ...entry, status: 'synced', serverRevision: conflict.currentServerRevision, syncedAt: new Date().toISOString(), lastError: undefined });
      await this.putConflict({ ...conflict, resolutionStatus: 'keep-remote' });
      return;
    }
    if (resolution === 'manual') {
      if (!payload || typeof payload !== 'object') throw new Error('A manually resolved record is required.');
      entry.payload = payload;
    }
    await this.put({ ...entry, status: 'pending', baseRevision: conflict.currentServerRevision, allowRestore: conflict.remoteDeleted && resolution === 'keep-local', idempotencyKey: crypto.randomUUID(), retryCount: 0, nextAttemptAt: Date.now(), lastError: undefined });
    await this.putConflict({ ...conflict, resolutionStatus: resolution === 'manual' ? 'manual-resolved' : 'keep-local' });
  }

  private async saveConflict(entry: SyncEntry, inlineRemote: unknown, revision: number | undefined, remoteDeleted: boolean, http: HttpClient): Promise<void> {
    let remote = inlineRemote;
    let deleted = remoteDeleted;
    let currentRevision = revision;
    if (remote === undefined && this.config.apiUrl) {
      try {
        const response = await firstValueFrom(http.get<{ record?: unknown; tombstone?: unknown; deleted?: boolean; revision?: number }>(`${this.config.apiUrl}/api/sync/${entry.entity}/${entry.resourceId}`));
        remote = response.record;
        deleted = response.deleted === true;
        currentRevision = response.revision ?? (response.record as { revision?: number } | undefined)?.revision;
      } catch (error) {
        if (!(error instanceof HttpErrorResponse && error.status === 404)) throw error;
        deleted = true;
      }
    }
    await this.put({ ...entry, status: 'conflict', serverRevision: currentRevision, lastError: `Synchronization conflict: remote ${deleted ? 'deletion' : 'version'} requires review.` });
    await this.putConflict({
      id: entry.id, resourceId: entry.resourceId, entity: entry.entity, localPendingVersion: entry.payload,
      remoteServerVersion: remote, localExpectedRevision: entry.baseRevision, currentServerRevision: currentRevision,
      detectedAt: new Date().toISOString(), originalOperation: entry.operation, idempotencyKey: entry.idempotencyKey ?? entry.id,
      resolutionStatus: 'pending', remoteDeleted: deleted,
    });
  }

  async prepareGuestMigration(records: readonly Countdown[]): Promise<number> {
    let added = 0;
    const existing = new Set((await this.list()).map((item) => item.resourceId));
    for (const record of records) {
      if (existing.has(record.id)) continue;
      await this.enqueue({ resourceId: record.id, entity: 'countdown', operation: 'upsert', payload: record, localRevision: record.updatedAt });
      existing.add(record.id);
      added++;
    }

    return added;
  }

  async lastSuccessfulSync(): Promise<string | undefined> {
    const state = await this.withStore<{ id: string; at?: string } | undefined>('readonly', (store) => store.get('last-success'), this.stateStoreName);
    return state?.at;
  }

  private async put(value: SyncEntry): Promise<void> { await this.withStore('readwrite', (store) => store.put(value)); }
  private async putConflict(value: SyncConflict): Promise<void> { await this.withStore('readwrite', (store) => store.put(value), this.conflictStoreName); }
  private async withStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>, storeName = this.storeName): Promise<T> {
    const db = await this.open();
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const request = action(tx.objectStore(storeName));
      let result: T;
      request.onsuccess = () => { result = request.result; };
      request.onerror = () => { db.close(); reject(request.error); };
      tx.oncomplete = () => { db.close(); resolve(result); };
      tx.onerror = () => { db.close(); reject(tx.error); };
      tx.onabort = () => { db.close(); reject(tx.error); };
    });
  }
  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB is unavailable.')); return; }
      const request = indexedDB.open(this.dbName, 4);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('countdowns')) request.result.createObjectStore('countdowns', { keyPath: 'id' });
        if (!request.result.objectStoreNames.contains('reminders')) request.result.createObjectStore('reminders', { keyPath: 'id' });
        if (!request.result.objectStoreNames.contains('reminder-preferences')) request.result.createObjectStore('reminder-preferences', { keyPath: 'id' });
        if (!request.result.objectStoreNames.contains(this.storeName)) request.result.createObjectStore(this.storeName, { keyPath: 'id' });
        if (!request.result.objectStoreNames.contains(this.conflictStoreName)) request.result.createObjectStore(this.conflictStoreName, { keyPath: 'id' });
        if (!request.result.objectStoreNames.contains(this.stateStoreName)) request.result.createObjectStore(this.stateStoreName, { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}