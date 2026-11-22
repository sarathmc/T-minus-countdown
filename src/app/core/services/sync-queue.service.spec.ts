import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CLOUD_CONFIG } from './cloud-config';
import { SyncQueueService } from './sync-queue.service';
import { Countdown } from '../../domain/models/countdown.model';

describe('SyncQueueService', () => {
  let queue: SyncQueueService;
  let http: HttpTestingController;

  beforeEach(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase('t-minus-countdown');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => resolve();
    });
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
      { provide: CLOUD_CONFIG, useValue: { supabaseUrl: '', supabaseAnonKey: '', apiUrl: 'https://api.example' } }] });
    queue = TestBed.inject(SyncQueueService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('keeps an upsert pending after a transient HTTP failure', async () => {
    spyOnProperty(navigator, 'onLine', 'get').and.returnValue(true);
    expect(navigator.onLine).toBeTrue();
    const resourceId = crypto.randomUUID();
    const entry = await queue.enqueue({ resourceId, entity: 'countdown', operation: 'upsert', payload: { title: 'Local' }, localRevision: new Date().toISOString() });
    const flushing = queue.flush();
    await new Promise((resolve) => setTimeout(resolve, 25));
    http.expectOne('https://api.example/api/sync').flush({}, { status: 503, statusText: 'Service Unavailable' });
    await flushing;
    const persisted = (await queue.list()).find((item) => item.id === entry.id);
    expect(persisted?.status).toBe('pending');
    expect(persisted?.retryCount).toBe(1);
    expect(persisted?.lastError).toContain('503');
  });

  it('deduplicates guest migration by countdown ID while preserving the original record', async () => {
    const record: Countdown = {
      id: crypto.randomUUID(), title: 'Local countdown', targetDate: '2027-01-15T12:00:00.000Z', timeZone: 'UTC',
      category: 'work', status: 'active', milestones: [], createdAt: '2026-11-19T00:00:00.000Z', updatedAt: '2026-11-19T00:00:00.000Z',
    };
    expect(await queue.prepareGuestMigration([record])).toBe(1);
    expect(await queue.prepareGuestMigration([record])).toBe(0);
    expect((await queue.list()).find((item) => item.resourceId === record.id)?.payload).toEqual(record);
  });

  it('persists a remote conflict and rebases keep-local on the current revision', async () => {
    spyOnProperty(navigator, 'onLine', 'get').and.returnValue(true);
    const resourceId = crypto.randomUUID();
    const entry = await queue.enqueue({ resourceId, entity: 'countdown', operation: 'upsert', payload: { id: resourceId, title: 'Local' }, localRevision: new Date().toISOString(), baseRevision: 1 });
    const flushing = queue.flush();
    await new Promise((resolve) => setTimeout(resolve, 25));
    http.expectOne('https://api.example/api/sync').flush({
      results: [{ id: resourceId, entity: 'countdown', status: 'conflict', code: 'VERSION_CONFLICT', revision: 2, current: { revision: 2, title: 'Remote' } }]
    });
    await flushing;
    expect((await queue.listConflicts()).find((item) => item.id === entry.id)).toEqual(jasmine.objectContaining({
      currentServerRevision: 2, resolutionStatus: 'pending', remoteDeleted: false,
    }));
    await queue.resolveConflict(entry.id, 'keep-local');
    const resolved = (await queue.list()).find((item) => item.id === entry.id);
    expect(resolved).toEqual(jasmine.objectContaining({ status: 'pending', baseRevision: 2 }));
    expect(resolved?.idempotencyKey).not.toBe(entry.idempotencyKey);
  });

  it('retrieves remote deletion metadata after an HTTP 409 and does not retry automatically', async () => {
    spyOnProperty(navigator, 'onLine', 'get').and.returnValue(true);
    const resourceId = crypto.randomUUID();
    const entry = await queue.enqueue({ resourceId, entity: 'countdown', operation: 'upsert', payload: { id: resourceId, title: 'Local' }, localRevision: new Date().toISOString() });
    const flushing = queue.flush();
    await new Promise((resolve) => setTimeout(resolve, 25));
    http.expectOne('https://api.example/api/sync').flush({ code: 'VERSION_CONFLICT' }, { status: 409, statusText: 'Conflict' });
    await new Promise((resolve) => setTimeout(resolve, 25));
    http.expectOne(`https://api.example/api/sync/countdown/${resourceId}`).flush({ deleted: true, tombstone: { recordId: resourceId } });
    await flushing;
    expect((await queue.list()).find((item) => item.id === entry.id)?.status).toBe('conflict');
    expect((await queue.listConflicts()).find((item) => item.id === entry.id)?.remoteDeleted).toBeTrue();
  });
});