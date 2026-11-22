import { Request } from 'express';
import { CreateCountdownDto, CreateMilestoneDto, CreateReminderDto, SyncRequestDto, UpdateCountdownDto, UpdateMilestoneDto, UpdateReminderDto } from './dtos';
import { ResourcesService } from './resources.service';
type UserRequest = Request & {
    userId: string;
};
export declare class ResourcesController {
    private readonly resources;
    constructor(resources: ResourcesService);
    profile(req: UserRequest): Promise<{
        id: string;
        createdAt: Date;
    }>;
    listCountdowns(req: UserRequest): Promise<({
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
    createCountdown(req: UserRequest, dto: CreateCountdownDto, key?: string): Promise<{
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
    updateCountdown(req: UserRequest, id: string, dto: UpdateCountdownDto, version?: string): Promise<{
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
    deleteCountdown(req: UserRequest, id: string): Promise<{
        deleted: boolean;
    }>;
    listMilestones(req: UserRequest): Promise<{
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
    createMilestone(req: UserRequest, dto: CreateMilestoneDto): Promise<{
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
    updateMilestone(req: UserRequest, id: string, dto: UpdateMilestoneDto): Promise<{
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
    deleteMilestone(req: UserRequest, id: string): Promise<{
        deleted: boolean;
    }>;
    listReminders(req: UserRequest): Promise<{
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
    createReminder(req: UserRequest, dto: CreateReminderDto): Promise<{
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
    updateReminder(req: UserRequest, id: string, dto: UpdateReminderDto): Promise<{
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
    deleteReminder(req: UserRequest, id: string): Promise<{
        deleted: boolean;
    }>;
    getSyncRecord(req: UserRequest, entity: string, id: string): Promise<{
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
    sync(req: UserRequest, dto: SyncRequestDto, key?: string): Promise<import("@prisma/client/runtime/library").JsonValue | {
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
}
export {};
