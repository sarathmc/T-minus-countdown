export declare class CreateCountdownDto {
    id: string;
    title: string;
    description?: string;
    targetDate: string;
    timeZone: string;
    category: string;
    status: string;
    createdAt: string;
    updatedAt: string;
}
export declare class UpdateCountdownDto {
    title: string;
    description?: string;
    targetDate: string;
    timeZone: string;
    category: string;
    status: string;
    updatedAt: string;
}
export declare class CreateMilestoneDto {
    id: string;
    countdownId: string;
    title: string;
    description?: string;
    date: string;
    offsetDays: number;
    done: boolean;
    isDefault: boolean;
}
export declare class UpdateMilestoneDto {
    title: string;
    description?: string;
    date: string;
    offsetDays: number;
    done: boolean;
    isDefault: boolean;
}
export declare class CreateReminderDto {
    id: string;
    countdownId: string;
    milestoneId?: string;
    title: string;
    description?: string;
    scheduledAt: string;
    timeZone: string;
    type: string;
    enabled: boolean;
}
export declare class UpdateReminderDto extends CreateReminderDto {
}
export declare class PushSubscriptionDto {
    endpoint: string;
    p256dh: string;
    auth: string;
}
export declare class SyncRequestDto {
    lastSyncedAt?: string;
    changes?: SyncChange[];
}
export declare class SyncChange {
    entity: 'countdown' | 'milestone' | 'reminder';
    id: string;
    operation: 'upsert' | 'delete';
    payload?: Record<string, unknown>;
    baseUpdatedAt?: string;
    baseRevision?: number;
    allowRestore?: boolean;
}
