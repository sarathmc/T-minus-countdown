import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CountdownStoreService } from './countdown-store.service';
import { COUNTDOWN_REPOSITORY } from './countdown-repository';
import { REMINDER_REPOSITORY, ReminderRepository } from './reminder-repository';
import { ReminderStoreService } from './reminder-store.service';
import { Reminder, ReminderPreferences, DEFAULT_REMINDER_PREFERENCES } from '../../domain/models/reminder.model';

describe('ReminderStoreService', () => {
  let service: ReminderStoreService;
  let countdowns: CountdownStoreService;
  let persisted: Reminder[];
  const repository: ReminderRepository = {
    load: async () => persisted,
    saveAll: async (reminders) => { persisted = [...reminders]; },
    loadPreferences: async () => ({ ...DEFAULT_REMINDER_PREFERENCES }),
    savePreferences: async (_preferences: ReminderPreferences) => undefined,
  };

  beforeEach(async () => {
    localStorage.clear();
    persisted = [];
    TestBed.configureTestingModule({ providers: [
      provideRouter([]),
      { provide: REMINDER_REPOSITORY, useValue: repository },
      { provide: COUNTDOWN_REPOSITORY, useValue: { load: async () => [], saveAll: async () => undefined } },
    ] });
    countdowns = TestBed.inject(CountdownStoreService);
    service = TestBed.inject(ReminderStoreService);
    countdowns.create({ title: 'Release', targetDate: new Date(Date.now() + 40 * 86_400_000).toISOString(), timeZone: 'UTC', category: 'work' });
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  function reminderInput(milestoneId?: string) {
    const countdown = countdowns.countdowns()[0];
    return {
      countdownId: countdown.id,
      ...(milestoneId ? { milestoneId } : {}),
      title: 'Review checkpoint', description: '', scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
      timeZone: 'UTC', type: milestoneId ? 'milestone' as const : 'custom' as const, enabled: true,
    };
  }

  it('creates, edits, enables, persists and deletes reminders associated with a countdown and milestone', async () => {
    const countdown = countdowns.countdowns()[0];
    const milestone = countdown.milestones[0];
    const created = service.create(reminderInput(milestone.id));
    expect(created.countdownId).toBe(countdown.id);
    expect(created.milestoneId).toBe(milestone.id);
    service.update(created.id, { ...reminderInput(milestone.id), title: 'Updated checkpoint' });
    service.setEnabled(created.id, false);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(service.scheduled().length).toBe(1);
    expect(service.upcoming().length).toBe(0);
    expect(persisted[0].title).toBe('Updated checkpoint');
    service.delete(created.id);
    await Promise.resolve();
    expect(service.reminders()).toEqual([]);
  });

  it('rejects duplicate milestone reminders unless explicitly allowed', () => {
    const milestoneId = countdowns.countdowns()[0].milestones[0].id;
    service.create(reminderInput(milestoneId));
    expect(() => service.create(reminderInput(milestoneId))).toThrowError(/already exists/);
    expect(service.create(reminderInput(milestoneId), true)).toBeTruthy();
  });

  it('marks past reminder schedules expired and rejects invalid countdown or milestone associations', () => {
    const past = { ...reminderInput(), scheduledAt: '2020-01-01T00:00:00.000Z' };
    expect(service.create(past).deliveryStatus).toBe('expired');
    expect(() => service.create({ ...reminderInput(), countdownId: 'missing' })).toThrowError(/existing countdown/);
    expect(() => service.create({ ...reminderInput(), milestoneId: 'not-owned' })).toThrowError(/belonging/);
  });
});