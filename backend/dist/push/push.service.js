"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const web_push_1 = require("web-push");
const node_crypto_1 = require("node:crypto");
const prisma_service_1 = require("../database/prisma.service");
let PushService = class PushService {
    prisma;
    configured;
    constructor(prisma, config) {
        this.prisma = prisma;
        const subject = config.get('VAPID_SUBJECT');
        const publicKey = config.get('VAPID_PUBLIC_KEY');
        const privateKey = config.get('VAPID_PRIVATE_KEY');
        this.configured = !!subject && !!publicKey && !!privateKey;
        if (this.configured)
            web_push_1.default.setVapidDetails(subject, publicKey, privateKey);
    }
    owned(userId, operation) {
        return this.prisma.$transaction(async (tx) => {
            await tx.$queryRaw `SELECT set_config('request.jwt.claim.sub', ${userId}, true)`;
            return operation(tx);
        });
    }
    async register(userId, dto) {
        return this.owned(userId, async (tx) => {
            const existing = await tx.notificationSubscription.findUnique({ where: { endpoint: dto.endpoint } });
            if (existing && existing.userId !== userId)
                throw new common_1.ConflictException('This subscription is already registered.');
            const subscription = existing
                ? await tx.notificationSubscription.update({ where: { id: existing.id }, data: { p256dh: dto.p256dh, auth: dto.auth } })
                : await tx.notificationSubscription.create({ data: { userId, endpoint: dto.endpoint, p256dh: dto.p256dh, auth: dto.auth } });
            await this.queueAllReminders(tx, userId, subscription.id);
            return { id: subscription.id, endpoint: subscription.endpoint, createdAt: subscription.createdAt, updatedAt: subscription.updatedAt };
        });
    }
    list(userId) {
        return this.owned(userId, (tx) => tx.notificationSubscription.findMany({
            where: { userId }, select: { id: true, endpoint: true, createdAt: true, updatedAt: true }, orderBy: { createdAt: 'asc' },
        }));
    }
    async remove(userId, id) {
        return this.owned(userId, async (tx) => {
            const result = await tx.notificationSubscription.deleteMany({ where: { id, userId } });
            if (result.count !== 1)
                throw new common_1.NotFoundException('Push subscription not found.');
            return { deleted: true };
        });
    }
    scheduleReminder(userId, reminderId) {
        return this.owned(userId, (tx) => this.queueReminder(tx, userId, reminderId));
    }
    cancelReminder(userId, reminderId) {
        return this.owned(userId, (tx) => this.cancelReminderInTransaction(tx, userId, reminderId));
    }
    async cancelCountdown(userId, countdownId) {
        return this.owned(userId, (tx) => this.cancelCountdownInTransaction(tx, userId, countdownId));
    }
    queueReminder(tx, userId, reminderId) {
        return this.queueReminderInTransaction(tx, userId, reminderId);
    }
    cancelReminderInTransaction(tx, userId, reminderId) {
        return tx.pushDelivery.updateMany({ where: { userId, reminderId, status: { in: ['queued', 'retrying', 'sending'] } }, data: { status: 'cancelled' } }).then(() => undefined);
    }
    cancelCountdownInTransaction(tx, userId, countdownId) {
        return tx.reminder.findMany({ where: { userId, countdownId }, select: { id: true } }).then((reminders) => reminders.length
            ? tx.pushDelivery.updateMany({ where: { userId, reminderId: { in: reminders.map((item) => item.id) }, status: { in: ['queued', 'retrying', 'sending'] } }, data: { status: 'cancelled' } }).then(() => undefined)
            : undefined);
    }
    async queueReminderInTransaction(tx, userId, reminderId) {
        const reminder = await tx.reminder.findFirst({ where: { id: reminderId, userId, enabled: true, status: 'scheduled' }, select: { id: true, scheduledAt: true } });
        if (!reminder || reminder.scheduledAt <= new Date())
            return;
        const subscriptions = await tx.notificationSubscription.findMany({ where: { userId }, select: { id: true } });
        if (!subscriptions.length)
            return;
        await tx.pushDelivery.createMany({
            data: subscriptions.map((subscription) => ({
                userId, reminderId, subscriptionId: subscription.id, nextAttemptAt: reminder.scheduledAt, idempotencyKey: (0, node_crypto_1.randomUUID)(),
            })),
            skipDuplicates: true,
        });
    }
    async queueAllReminders(tx, userId, subscriptionId) {
        const reminders = await tx.reminder.findMany({ where: { userId, enabled: true, status: 'scheduled', scheduledAt: { gt: new Date() } }, select: { id: true, scheduledAt: true } });
        if (reminders.length)
            await tx.pushDelivery.createMany({
                data: reminders.map((reminder) => ({ userId, reminderId: reminder.id, subscriptionId, nextAttemptAt: reminder.scheduledAt, idempotencyKey: (0, node_crypto_1.randomUUID)() })),
                skipDuplicates: true,
            });
    }
    async processDueForUser(userId) {
        if (!this.configured)
            throw new common_1.ServiceUnavailableException('Web Push is not configured.');
        const deliveries = await this.owned(userId, async (tx) => {
            const now = new Date();
            const claimToken = (0, node_crypto_1.randomUUID)();
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
            const subscription = { endpoint: delivery.subscription.endpoint, keys: { p256dh: delivery.subscription.p256dh, auth: delivery.subscription.auth } };
            const payload = JSON.stringify({ type: 'reminder', reminderId: delivery.reminder.id, countdownId: delivery.reminder.countdownId });
            try {
                await web_push_1.default.sendNotification(subscription, payload, { TTL: 86_400 });
                await this.owned(userId, (tx) => tx.pushDelivery.update({ where: { id: delivery.id }, data: { status: 'delivered', attempts: { increment: 1 }, deliveredAt: new Date(), lastError: null, claimToken: null, claimExpiresAt: null } }).then(() => undefined));
            }
            catch (error) {
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
    async queueMetricsForUser(userId) {
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
};
exports.PushService = PushService;
exports.PushService = PushService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, config_1.ConfigService])
], PushService);
//# sourceMappingURL=push.service.js.map