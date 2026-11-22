export type ReminderType = 'countdown' | 'milestone' | 'custom';
export type ReminderDeliveryStatus = 'scheduled' | 'delivered' | 'expired' | 'cancelled';

export interface Reminder {
  id: string;
  countdownId: string;
  milestoneId?: string;
  title: string;
  description?: string;
  /** ISO-8601 instant, converted from the selected timezone at entry. */
  scheduledAt: string;
  timeZone: string;
  type: ReminderType;
  enabled: boolean;
  deliveryStatus: ReminderDeliveryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderPreferences {
  notificationsEnabled: boolean;
  dailyReminderEnabled: boolean;
  dailyReminderTime: string;
  timeZone: string;
}

export const DEFAULT_REMINDER_PREFERENCES: ReminderPreferences = {
  notificationsEnabled: false,
  dailyReminderEnabled: false,
  dailyReminderTime: '09:00',
  timeZone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' : 'UTC',
};

export const REMINDER_PRESETS = [
  { days: 60, label: '60 days before' },
  { days: 30, label: '30 days before' },
  { days: 14, label: '14 days before' },
  { days: 7, label: '7 days before' },
  { days: 3, label: '3 days before' },
  { days: 1, label: '1 day before' },
  { days: 0, label: 'On deadline day' },
] as const;

export function isReminderRecord(value: unknown): value is Reminder {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<Reminder>;
  return typeof item.id === 'string' && !!item.id && typeof item.countdownId === 'string' && !!item.countdownId &&
    (item.milestoneId === undefined || typeof item.milestoneId === 'string') && typeof item.title === 'string' && !!item.title.trim() &&
    (item.description === undefined || typeof item.description === 'string') &&
    typeof item.scheduledAt === 'string' && Number.isFinite(Date.parse(item.scheduledAt)) &&
    typeof item.timeZone === 'string' && isTimeZone(item.timeZone) &&
    ['countdown', 'milestone', 'custom'].includes(item.type ?? '') && typeof item.enabled === 'boolean' &&
    ['scheduled', 'delivered', 'expired', 'cancelled'].includes(item.deliveryStatus ?? '') &&
    typeof item.createdAt === 'string' && Number.isFinite(Date.parse(item.createdAt)) &&
    typeof item.updatedAt === 'string' && Number.isFinite(Date.parse(item.updatedAt));
}

export function isTimeZone(timeZone: string): boolean {
  try { new Intl.DateTimeFormat('en', { timeZone }); return true; } catch { return false; }
}