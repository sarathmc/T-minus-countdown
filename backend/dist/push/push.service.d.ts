import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { PushSubscriptionDto } from '../resources/dtos';
export declare class PushService {
    private readonly prisma;
    private readonly configured;
    constructor(prisma: PrismaService, config: ConfigService);
    private owned;
    register(userId: string, dto: PushSubscriptionDto): Promise<{
        id: string;
        endpoint: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    list(userId: string): Promise<{
        id: string;
        endpoint: string;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    remove(userId: string, id: string): Promise<{
        deleted: true;
    }>;
    scheduleReminder(userId: string, reminderId: string): Promise<void>;
    cancelReminder(userId: string, reminderId: string): Promise<void>;
    cancelCountdown(userId: string, countdownId: string): Promise<void>;
    queueReminder(tx: Prisma.TransactionClient, userId: string, reminderId: string): Promise<void>;
    cancelReminderInTransaction(tx: Prisma.TransactionClient, userId: string, reminderId: string): Promise<void>;
    cancelCountdownInTransaction(tx: Prisma.TransactionClient, userId: string, countdownId: string): Promise<void>;
    private queueReminderInTransaction;
    private queueAllReminders;
    processDueForUser(userId: string): Promise<number>;
    queueMetricsForUser(userId: string): Promise<Record<string, number>>;
}
