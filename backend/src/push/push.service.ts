import { ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import webpush from 'web-push';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { PushSubscriptionDto } from '../resources/dtos';

@Injectable()
export class PushService {
  private readonly configured: boolean;

  constructor(private readonly prisma: PrismaService, config: ConfigService) {
    const subject = config.get<string>('VAPID_SUBJECT');
    const publicKey = config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = config.get<string>('VAPID_PRIVATE_KEY');
    this.configured = !!subject && !!publicKey && !!privateKey;
    if (this.configured) webpush.setVapidDetails(subject!, publicKey!, privateKey!);
  }

  private owned<T>(userId: string, operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('request.jwt.claim.sub', ${userId}, true)`;
      return operation(tx);
    });
  }

  async register(userId: string, dto: PushSubscriptionDto) {
    return this.owned(userId, async (tx) => {
      const existing = await tx.notificationSubscription.findUnique({ where: { endpoint: dto.endpoint } });
      if (existing && existing.userId !== userId) throw new ConflictException('This subscription is already registered.');
      const subscription = existing
        ? await tx.notificationSubscription.update({ where: { id: existing.id }, data: { p256dh: dto.p256dh, auth: dto.auth } })
        : await tx.notificationSubscription.create({ data: { userId, endpoint: dto.endpoint, p256dh: dto.p256dh, auth: dto.auth } });
      await this.queueAllReminders(tx, userId, subscription.id);
      return { id: subscription.id, endpoint: subscription.endpoint, createdAt: subscription.createdAt, updatedAt: subscription.updatedAt };
    });
  }

  list(userId: string) {
    return this.owned(userId, (tx) => tx.notificationSubscription.findMany({
      where: { userId }, select: { id: true, endpoint: true, createdAt: true, updatedAt: true }, orderBy: { createdAt: 'asc' },
    }));
  }

  async remove(userId: string, id: string): Promise<{ deleted: true }> {
    return this.owned(userId, async (tx) => {
      const result = await tx.notificationSubscription.deleteMany({ where: { id, userId } });
      if (result.count !== 1) throw new NotFoundException('Push subscription not found.');
      return { deleted: true };
    });
  }

  scheduleReminder(userId: string, reminderId: string): Promise<void> {
    return this.owned(userId, (tx) => this.queueReminder(tx, userId, reminderId));
  }

  cancelReminder(userId: string, reminderId: string): Promise<void> {
    return this.owned(userId, (tx) => this.cancelReminderInTransaction(tx, userId, reminderId));
  }

  async cancelCountdown(userId: string, countdownId: string): Promise<void> {
    return this.owned(userId, (tx) => this.cancelCountdownInTransaction(tx, userId, countdownId));
  }

  queueReminder(tx: Prisma.TransactionClient, userId: string, reminderId: string): Promise<void> {
    return this.queueReminderInTransaction(tx, userId, reminderId);
  }

  cancelReminderInTransaction(tx: Prisma.TransactionClient, userId: string, reminderId: string): Promise<void> {
    return tx.pushDelivery.updateMany({ where: { userId, reminderId, status: { in: ['queued', 'retrying', 'sending'] } }, data: { status: 'cancelled' } }).then(() => undefined);
  }

  cancelCountdownInTransaction(tx: Prisma.TransactionClient, userId: string, countdownId: string): Promise<void> {
    return tx.reminder.findMany({ where: { userId, countdownId }, select: { id: true } }).then((reminders) =>
      reminders.length
        ? tx.pushDelivery.updateMany({ where: { userId, reminderId: { in: reminders.map((item) => item.id) }, status: { in: ['queued', 'retrying', 'sending'] } }, data: { status: 'cancelled' } }).then(() => undefined)
        : undefined);
  }

  private async queueReminderInTransaction(tx: Prisma.TransactionClient, userId: string, reminderId: string): Promise<void> {
    const reminder = await tx.reminder.findFirst({ where: { id: reminderId, userId, enabled: true, status: 'scheduled' }, select: { id: true, scheduledAt: true } });
    if (!reminder || reminder.scheduledAt <= new Date()) return;
    const subscriptions = await tx.notificationSubscription.findMany({ where: { userId }, select: { id: true } });
    if (!subscriptions.length) return;
    await tx.pushDelivery.createMany({
      data: subscriptions.map((subscription) => ({
        userId, reminderId, subscriptionId: subscription.id, nextAttemptAt: reminder.scheduledAt, idempotencyKey: randomUUID(),
      })),
      skipDuplicates: true,
    });
  }

  private async queueAllReminders(tx: Prisma.TransactionClient, userId: string, subscriptionId: string): Promise<void> {
    const reminders = await tx.reminder.findMany({ where: { userId, enabled: true, status: 'scheduled', scheduledAt: { gt: new Date() } }, select: { id: true, scheduledAt: true } });
    if (reminders.length) await tx.pushDelivery.createMany({
      data: reminders.map((reminder) => ({ userId, reminderId: reminder.id, subscriptionId, nextAttemptAt: reminder.scheduledAt, idempotencyKey: randomUUID() })),
      skipDuplicates: true,
    });
  }

  async processDueForUser(userId: string): Promise<number> {
    if (!this.configured) throw new ServiceUnavailableException('Web Push is not configured.');
    const deliveries = await this.owned(userId, async (tx) => {
      const now = new Date();
      const claimToken = randomUUID();
      await tx.pushDelivery.updateMany({
        where: {
          userId,
          OR: [
            { status: { in: ['queued', 'retrying'] }, nextAttemptAt: { lte: now } },
            { status: 'sending', claimExpiresAt: { lt: now } },
          ],
        },
        data: { status: 'sending', claimToken, claimExpiresAt: new Date(Date.now() + 60_000) },
      });
      return tx.pushDelivery.findMany({
        where: { userId, claimToken },
        include: { subscription: true, reminder: { select: { id: true, countdownId: true } } }, take: 100,
      });
    });
    for (const delivery of deliveries) {
      const subscription: webpush.PushSubscription = { endpoint: delivery.subscription.endpoint, keys: { p256dh: delivery.subscription.p256dh, auth: delivery.subscription.auth } };
      const payload = JSON.stringify({ type: 'reminder', reminderId: delivery.reminder.id, countdownId: delivery.reminder.countdownId });
      try {
        await webpush.sendNotification(subscription, payload, { TTL: 86_400 });
        await this.owned(userId, (tx) => tx.pushDelivery.update({ where: { id: delivery.id }, data: { status: 'delivered', attempts: { increment: 1 }, deliveredAt: new Date(), lastError: null, claimToken: null, claimExpiresAt: null } }).then(() => undefined));
      } catch (error) {
        const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error ? Number(error.statusCode) : 0;
        if (statusCode === 404 || statusCode === 410) {
          await this.owned(userId, (tx) => tx.notificationSubscription.deleteMany({ where: { id: delivery.subscriptionId, userId } }).then(() => undefined));
          continue;
        }
        const attempts = delivery.attempts + 1;
        await this.owned(userId, (tx) => tx.pushDelivery.update({
          where: { id: delivery.id },
          data: attempts >= 5
            ? { status: 'failed', attempts, lastError: `Push delivery failed (${statusCode || 'transport'}).`, claimToken: null, claimExpiresAt: null }
            : { status: 'retrying', attempts, nextAttemptAt: new Date(Date.now() + Math.min(300_000, 1000 * (2 ** attempts))), lastError: `Push delivery failed (${statusCode || 'transport'}).`, claimToken: null, claimExpiresAt: null },
        }).then(() => undefined));
      }
    }
    return deliveries.length;
  }

  async queueMetricsForUser(userId: string): Promise<Record<string, number>> {
    return this.owned(userId, async (tx) => {
      const [queued, retrying, sending, delivered, failed, cancelled] = await Promise.all([
        tx.pushDelivery.count({ where: { userId, status: 'queued' } }),
        tx.pushDelivery.count({ where: { userId, status: 'retrying' } }),
        tx.pushDelivery.count({ where: { userId, status: 'sending' } }),
        tx.pushDelivery.count({ where: { userId, status: 'delivered' } }),
        tx.pushDelivery.count({ where: { userId, status: 'failed' } }),
        tx.pushDelivery.count({ where: { userId, status: 'cancelled' } }),
      ]);
      return { queued, retrying, sending, delivered, failed, cancelled };
    });
  }
}
