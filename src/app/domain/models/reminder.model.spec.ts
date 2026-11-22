import { DEFAULT_REMINDER_PREFERENCES, Reminder, isReminderRecord } from './reminder.model';
import { fromDateTimeLocal, toDateTimeLocal } from './reminder-time';

describe('reminder domain', () => {
  const valid: Reminder = {
    id: 'r1', countdownId: 'c1', milestoneId: 'm1', title: 'Review', scheduledAt: '2027-01-15T12:00:00.000Z',
    timeZone: 'UTC', type: 'milestone', enabled: true, deliveryStatus: 'scheduled',
    createdAt: '2026-11-19T00:00:00.000Z', updatedAt: '2026-11-19T00:00:00.000Z',
  };

  it('validates reminder data and rejects invalid timestamps, timezones and statuses', () => {
    expect(isReminderRecord(valid)).toBeTrue();
    expect(isReminderRecord({ ...valid, scheduledAt: 'not a date' })).toBeFalse();
    expect(isReminderRecord({ ...valid, timeZone: 'Mars/Olympus' })).toBeFalse();
    expect(isReminderRecord({ ...valid, deliveryStatus: 'unknown' })).toBeFalse();
  });

  it('provides local reminder preference defaults', () => {
    expect(DEFAULT_REMINDER_PREFERENCES.notificationsEnabled).toBeFalse();
    expect(DEFAULT_REMINDER_PREFERENCES.dailyReminderTime).toMatch(/^\d{2}:\d{2}$/);
  });

  it('converts an instant into the selected timezone and back', () => {
    const instant = fromDateTimeLocal('2027-01-15T07:30', 'America/New_York');
    expect(instant).toBe('2027-01-15T12:30:00.000Z');
    expect(toDateTimeLocal(instant, 'America/New_York')).toBe('2027-01-15T07:30');
  });

  it('rejects wall-clock times skipped by a daylight-saving transition', () => {
    expect(() => fromDateTimeLocal('2027-03-14T02:30', 'America/New_York')).toThrowError(/daylight-saving/);
  });
});