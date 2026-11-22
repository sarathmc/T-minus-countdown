import { TestBed } from '@angular/core/testing';
import { CountdownFactoryService } from './countdown-factory.service';

describe('CountdownFactoryService', () => {
  let service: CountdownFactoryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CountdownFactoryService);
  });

  function futureIso(daysFromNow: number): string {
    return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString();
  }

  it('creates a countdown with generated default milestones', () => {
    const countdown = service.create({
      title: '  Launch portfolio  ',
      targetDate: futureIso(70),
      timeZone: 'UTC',
      category: 'work',
    });

    expect(countdown.title).toBe('Launch portfolio');
    expect(countdown.status).toBe('active');
    expect(countdown.milestones.length).toBe(9);
  });

  it('rejects an empty title', () => {
    expect(() =>
      service.create({ title: '   ', targetDate: futureIso(5), timeZone: 'UTC', category: 'other' })
    ).toThrowError(/title is required/i);
  });

  it('rejects a target date in the past', () => {
    expect(() =>
      service.create({
        title: 'Past event',
        targetDate: futureIso(-1),
        timeZone: 'UTC',
        category: 'other',
      })
    ).toThrowError(/future date/i);
  });

  it('rejects an unparsable target date', () => {
    expect(() =>
      service.create({
        title: 'Bad date',
        targetDate: 'not-a-date',
        timeZone: 'UTC',
        category: 'other',
      })
    ).toThrowError(/valid target date/i);
  });

  it('duplicates a countdown with a new id, reset milestones, and "(copy)" suffix', () => {
    const original = service.create({
      title: 'Ship v1',
      targetDate: futureIso(30),
      timeZone: 'UTC',
      category: 'work',
    });
    original.milestones[0].done = true;

    const copy = service.duplicate(original);

    expect(copy.id).not.toBe(original.id);
    expect(copy.title).toBe('Ship v1 (copy)');
    expect(copy.milestones.every((m) => m.done === false)).toBeTrue();
    expect(copy.milestones.every((m) => m.countdownId === copy.id)).toBeTrue();
  });
});
