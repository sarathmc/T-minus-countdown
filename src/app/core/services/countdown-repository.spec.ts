import { Countdown } from '../../domain/models/countdown.model';
import { isCountdownRecord } from './countdown-repository';

describe('isCountdownRecord', () => {
  const validCountdown: Countdown = {
    id: 'countdown-1',
    title: 'Project launch',
    targetDate: '2027-01-15T12:00:00.000Z',
    timeZone: 'UTC',
    category: 'work',
    status: 'active',
    milestones: [{
      id: 'milestone-1', countdownId: 'countdown-1', title: 'Review',
      date: '2027-01-01T12:00:00.000Z', offsetDays: 14, done: false, isDefault: true,
    }],
    createdAt: '2026-11-19T00:00:00.000Z',
    updatedAt: '2026-11-19T00:00:00.000Z',
  };

  it('accepts a complete countdown record', () => {
    expect(isCountdownRecord(validCountdown)).toBeTrue();
  });

  it('rejects invalid dates and missing required countdown fields', () => {
    expect(isCountdownRecord({ ...validCountdown, targetDate: 'not-a-date' })).toBeFalse();
    expect(isCountdownRecord({ ...validCountdown, category: 'unknown' })).toBeFalse();
    expect(isCountdownRecord({ ...validCountdown, milestones: [{ ...validCountdown.milestones[0], done: 'yes' }] })).toBeFalse();
  });

  it('rejects milestones that belong to a different countdown', () => {
    expect(isCountdownRecord({ ...validCountdown, milestones: [{ ...validCountdown.milestones[0], countdownId: 'other' }] })).toBeFalse();
  });
});