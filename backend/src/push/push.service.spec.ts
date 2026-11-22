import { ConflictException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { PushService } from './push.service';
import webpush from 'web-push';

jest.mock('web-push', () => ({ __esModule: true, default: { setVapidDetails: jest.fn(), sendNotification: jest.fn() } }));

describe('PushService', () => {
  const userId = 'c0a80101-0000-4000-8000-000000000001';
  const subscriptionId = 'c0a80101-0000-4000-8000-000000000002';
  const endpoint = 'https://push.example/subscription';

  function fixture(existing?: { id: string; userId: string }) {
    const tx = {
      $queryRaw: jest.fn(),
      notificationSubscription: {
        findUnique: jest.fn().mockResolvedValue(existing ?? null),
        create: jest.fn().mockResolvedValue({ id: subscriptionId, userId, endpoint, createdAt: new Date(), updatedAt: new Date() }),
        update: jest.fn().mockResolvedValue({ id: subscriptionId, userId, endpoint, createdAt: new Date(), updatedAt: new Date() }),
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      reminder: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn() },
      pushDelivery: { createMany: jest.fn(), updateMany: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    };
    const transaction = jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx));
    const config = { get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService;
    return { tx, service: new PushService({ $transaction: transaction } as unknown as PrismaService, config), transaction };
  }

  it('registers an owned subscription and creates durable future delivery jobs', async () => {
    const { tx, service } = fixture();
    tx.reminder.findMany.mockResolvedValue([{ id: 'c0a80101-0000-4000-8000-000000000003', scheduledAt: new Date(Date.now() + 60_000) }]);
    tx.notificationSubscription.findMany.mockResolvedValue([{ id: subscriptionId }]);
    await service.register(userId, { endpoint, p256dh: 'p'.repeat(16), auth: 'a'.repeat(16) });
    expect(tx.pushDelivery.createMany).toHaveBeenCalledWith(expect.objectContaining({ skipDuplicates: true }));
  });

  it('rejects an endpoint owned by another user', async () => {
    const { service } = fixture({ id: subscriptionId, userId: 'c0a80101-0000-4000-8000-000000000099' });
    await expect(service.register(userId, { endpoint, p256dh: 'p'.repeat(16), auth: 'a'.repeat(16) })).rejects.toBeInstanceOf(ConflictException);
  });

  it('enforces ownership on deletion', async () => {
    const { tx, service } = fixture();
    tx.notificationSubscription.deleteMany.mockResolvedValue({ count: 0 });
    await expect(service.remove(userId, subscriptionId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('fails closed when VAPID delivery is not configured', async () => {
    const { service } = fixture();
    await expect(service.processDueForUser(userId)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('removes expired subscriptions without exposing their endpoint', async () => {
    const { tx } = fixture();
    const config = { get: jest.fn((name: string) => name === 'VAPID_SUBJECT' ? 'mailto:test@example.invalid' : 'configured') } as unknown as ConfigService;
    const service = new PushService({ $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) } as unknown as PrismaService, config);
    tx.pushDelivery.findMany.mockResolvedValue([{
      id: 'delivery-1', attempts: 0, subscriptionId, subscription: { endpoint, p256dh: 'p'.repeat(16), auth: 'a'.repeat(16) },
      reminder: { id: 'reminder-1', countdownId: 'countdown-1' },
    }]);
    (webpush.sendNotification as jest.Mock).mockRejectedValueOnce({ statusCode: 410 });
    await service.processDueForUser(userId);
    expect(tx.pushDelivery.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'sending', claimToken: expect.any(String), claimExpiresAt: expect.any(Date) }),
    }));
    expect(tx.notificationSubscription.deleteMany).toHaveBeenCalledWith({ where: { id: subscriptionId, userId } });
  });
});
