import { createHash } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { ResourcesService } from './resources.service';

describe('ResourcesService synchronization', () => {
  const userId = 'c0a80101-0000-4000-8000-000000000001';
  const recordId = 'c0a80101-0000-4000-8000-000000000002';

  function fixture(existing?: { id: string; userId: string; updatedAt: Date; revision?: number }) {
    const tx = {
      $queryRaw: jest.fn(),
      syncRequest: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() },
      countdown: {
        findFirst: jest.fn().mockResolvedValue(existing ?? null), create: jest.fn(), update: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }), deleteMany: jest.fn(), findFirstOrThrow: jest.fn(), findMany: jest.fn().mockResolvedValue([]),
      },
      milestone: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn().mockResolvedValue({ count: 1 }), deleteMany: jest.fn() },
      reminder: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn().mockResolvedValue({ count: 1 }), deleteMany: jest.fn() },
      deletedRecord: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]), upsert: jest.fn() },
      synchronizationMetadata: { upsert: jest.fn() },
    };
    const transaction = jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx));
    return { tx, service: new ResourcesService({ $transaction: transaction } as unknown as PrismaService), transaction };
  }

  const payload = { id: recordId, title: 'New deadline', targetDate: '2027-01-15T12:00:00.000Z', timeZone: 'UTC', category: 'work', status: 'active', milestones: [] };

  it('creates a record, uses server timestamps, and stores the idempotent response in the transaction', async () => {
    const { tx, service } = fixture();
    const saved = { id: recordId, userId, updatedAt: new Date() };
    tx.countdown.findFirstOrThrow.mockResolvedValue(saved);
    const result = await service.sync(userId, { changes: [{ entity: 'countdown', id: recordId, operation: 'upsert', payload }] }, 'request-1');
    expect(tx.countdown.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ id: recordId, userId, createdAt: expect.any(Date), updatedAt: expect.any(Date) }) }));
    expect(result).toHaveProperty('results.0.status', 'created');
    expect(tx.syncRequest.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId, idempotencyKey: 'request-1', response: JSON.parse(JSON.stringify(result)) }) }));
  });

  it('returns a structured conflict and does not overwrite a stale revision', async () => {
    const updatedAt = new Date('2026-01-01T00:00:00.000Z');
    const { tx, service } = fixture({ id: recordId, userId, updatedAt });
    const result = await service.sync(userId, { changes: [{ entity: 'countdown', id: recordId, operation: 'upsert', payload, baseUpdatedAt: '2025-12-01T00:00:00.000Z' }] }, 'request-2') as unknown as { results: Array<{ status: string; code?: string; current?: { updatedAt: Date } }> };
    expect(result.results[0]).toMatchObject({ status: 'conflict', code: 'VERSION_CONFLICT', current: { updatedAt } });
    expect(tx.countdown.update).not.toHaveBeenCalled();
  });

  it('replays the stored response for an identical idempotency key without reapplying writes', async () => {
    const response = { results: [{ id: recordId, status: 'created' }] };
    const { tx, service } = fixture();
    const requestHash = createHash('sha256').update(JSON.stringify({ changes: [], lastSyncedAt: null })).digest('hex');
    tx.syncRequest.findUnique.mockResolvedValue({ requestHash, response });
    const hash = await service.sync(userId, { changes: [] }, 'request-3');
    expect(hash).toEqual(response);
    expect(tx.countdown.create).not.toHaveBeenCalled();
  });

  it('rejects reuse of an idempotency key with a different request', async () => {
    const { tx, service } = fixture();
    tx.syncRequest.findUnique.mockResolvedValue({ requestHash: 'different-hash', response: {} });
    await expect(service.sync(userId, { changes: [] }, 'request-4')).rejects.toMatchObject({ status: 409 });
  });

  it('requires an idempotency key before starting a transaction', async () => {
    const { service, transaction } = fixture();
    await expect(service.sync(userId, { changes: [] })).rejects.toMatchObject({ status: 400 });
    expect(transaction).not.toHaveBeenCalled();
  });

  it('records an ownership-scoped tombstone and acknowledges a delete', async () => {
    const { tx, service } = fixture({ id: recordId, userId, updatedAt: new Date('2026-01-01T00:00:00.000Z'), revision: 3 });
    const result = await service.sync(userId, { changes: [{ entity: 'countdown', id: recordId, operation: 'delete', baseRevision: 3 }] }, 'request-delete') as { results: Array<Record<string, unknown>> };
    expect(tx.deletedRecord.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_entity_recordId: { userId, entity: 'countdown', recordId } },
      create: { userId, entity: 'countdown', recordId },
    }));
    expect(result.results[0]).toMatchObject({ status: 'deleted', revision: 3 });
  });

  it('does not treat a second create as an update', async () => {
    const { tx, service } = fixture({ id: recordId, userId, updatedAt: new Date('2026-01-01T00:00:00.000Z'), revision: 1 });
    const result = await service.sync(userId, { changes: [{ entity: 'countdown', id: recordId, operation: 'upsert', payload }] }, 'request-duplicate-record') as { results: Array<Record<string, unknown>> };
    expect(result.results[0]).toMatchObject({ status: 'conflict', code: 'RECORD_EXISTS' });
    expect(tx.countdown.updateMany).not.toHaveBeenCalled();
  });
});