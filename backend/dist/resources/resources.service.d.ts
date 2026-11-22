import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { PushService } from '../push/push.service';
import { CreateCountdownDto, CreateMilestoneDto, CreateReminderDto, SyncRequestDto, UpdateCountdownDto, UpdateMilestoneDto, UpdateReminderDto } from './dtos';
export declare class ResourcesService {
    private readonly prisma;
    private readonly push?;
    constructor(prisma: PrismaService, push?: PushService | undefined);
    private owned;
    profile(userId: string): Promise<{
        id: string;
        createdAt: Date;
    }>;
    listCountdowns(userId: string): Promise<({
        milestones: {
            description: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            countdownId: string;
            title: string;
            revision: number;
            date: Date;
            offsetDays: number | null;
            done: boolean;
            isDefault: boolean;
        }[];
    } & {
        description: string;
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string;
        timeZone: string;
        revision: number;
        targetDate: Date;
        category: string;
    })[]>;
    createCountdown(userId: string, dto: CreateCountdownDto, idempotencyKey?: string): Promise<{
        description: string;
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string;
        timeZone: string;
        revision: number;
        targetDate: Date;
        category: string;
    }>;
    updateCountdown(userId: string, id: string, dto: UpdateCountdownDto, ifMatch?: string): Promise<{
        description: string;
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string;
        timeZone: string;
        revision: number;
        targetDate: Date;
        category: string;
    }>;
    deleteCountdown(userId: string, id: string): Promise<{
        deleted: boolean;
    }>;
    listMilestones(userId: string): Promise<{
        description: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        countdownId: string;
        title: string;
        revision: number;
        date: Date;
        offsetDays: number | null;
        done: boolean;
        isDefault: boolean;
    }[]>;
    createMilestone(userId: string, dto: CreateMilestoneDto): Promise<{
        description: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        countdownId: string;
        title: string;
        revision: number;
        date: Date;
        offsetDays: number | null;
        done: boolean;
        isDefault: boolean;
    }>;
    updateMilestone(userId: string, id: string, dto: UpdateMilestoneDto): Promise<{
        description: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        countdownId: string;
        title: string;
        revision: number;
        date: Date;
        offsetDays: number | null;
        done: boolean;
        isDefault: boolean;
    }>;
    deleteMilestone(userId: string, id: string): Promise<{
        deleted: boolean;
    }>;
    listReminders(userId: string): Promise<{
        description: string;
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        countdownId: string;
        milestoneId: string | null;
        title: string;
        scheduledAt: Date;
        timeZone: string;
        type: string;
        enabled: boolean;
        revision: number;
    }[]>;
    createReminder(userId: string, dto: CreateReminderDto): Promise<{
        description: string;
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        countdownId: string;
        milestoneId: string | null;
        title: string;
        scheduledAt: Date;
        timeZone: string;
        type: string;
        enabled: boolean;
        revision: number;
    }>;
    updateReminder(userId: string, id: string, dto: UpdateReminderDto): Promise<{
        description: string;
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        countdownId: string;
        milestoneId: string | null;
        title: string;
        scheduledAt: Date;
        timeZone: string;
        type: string;
        enabled: boolean;
        revision: number;
    }>;
    deleteReminder(userId: string, id: string): Promise<{
        deleted: boolean;
    }>;
    getSyncRecord(userId: string, entity: string, id: string): Promise<{
        entity: string;
        id: string;
        deleted: boolean;
        record: {
            description: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            countdownId: string;
            title: string;
            revision: number;
            date: Date;
            offsetDays: number | null;
            done: boolean;
            isDefault: boolean;
        } | {
            description: string;
            status: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            countdownId: string;
            milestoneId: string | null;
            title: string;
            scheduledAt: Date;
            timeZone: string;
            type: string;
            enabled: boolean;
            revision: number;
        } | ({
            milestones: {
                description: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                userId: string;
                countdownId: string;
                title: string;
                revision: number;
                date: Date;
                offsetDays: number | null;
                done: boolean;
                isDefault: boolean;
            }[];
        } & {
            description: string;
            status: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            title: string;
            timeZone: string;
            revision: number;
            targetDate: Date;
            category: string;
        });
        tombstone?: undefined;
    } | {
        entity: string;
        id: string;
        deleted: boolean;
        tombstone: {
            id: string;
            userId: string;
            entity: string;
            recordId: string;
            deletedAt: Date;
        };
        record?: undefined;
    }>;
    sync(userId: string, request: SyncRequestDto, idempotencyKey?: string): Promise<Prisma.JsonValue | {
        serverTime: string;
        results: Record<string, unknown>[];
        countdowns: ({
            milestones: {
                description: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                userId: string;
                countdownId: string;
                title: string;
                revision: number;
                date: Date;
                offsetDays: number | null;
                done: boolean;
                isDefault: boolean;
            }[];
        } & {
            description: string;
            status: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            title: string;
            timeZone: string;
            revision: number;
            targetDate: Date;
            category: string;
        })[];
        milestones: {
            description: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            countdownId: string;
            title: string;
            revision: number;
            date: Date;
            offsetDays: number | null;
            done: boolean;
            isDefault: boolean;
        }[];
        reminders: {
            description: string;
            status: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            countdownId: string;
            milestoneId: string | null;
            title: string;
            scheduledAt: Date;
            timeZone: string;
            type: string;
            enabled: boolean;
            revision: number;
        }[];
        deletions: {
            id: string;
            userId: string;
            entity: string;
            recordId: string;
            deletedAt: Date;
        }[];
    }>;
    private validateSyncPayload;
    private requireCountdown;
}
