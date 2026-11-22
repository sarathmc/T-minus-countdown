import { CountdownCalculatorService } from './countdown-calculator.service';

describe('CountdownCalculatorService', () => {
  let service: CountdownCalculatorService;

  beforeEach(() => {
    service = new CountdownCalculatorService();
  });

  it('computes days/hours/minutes/seconds remaining until a future target', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const target = new Date('2026-01-03T01:02:03.000Z');

    const parts = service.getTimeParts(target, now);

    expect(parts.isPast).toBeFalse();
    expect(parts.days).toBe(2);
    expect(parts.hours).toBe(1);
    expect(parts.minutes).toBe(2);
    expect(parts.seconds).toBe(3);
  });

  it('clamps all parts to zero and sets isPast for a deadline already in the past', () => {
    const now = new Date('2026-01-10T00:00:00.000Z');
    const target = new Date('2026-01-01T00:00:00.000Z');

    const parts = service.getTimeParts(target, now);

    expect(parts.isPast).toBeTrue();
    expect(parts.days).toBe(0);
    expect(parts.hours).toBe(0);
    expect(parts.minutes).toBe(0);
    expect(parts.seconds).toBe(0);
    expect(parts.totalMs).toBeLessThan(0);
  });

  it('treats a target exactly equal to now as past', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    expect(service.isPast(now, now)).toBeTrue();
  });

  it('computes the same remaining duration regardless of which UTC offset the target was written in', () => {
    const now = new Date('2026-06-01T00:00:00.000Z');
    // Same instant in time, expressed with two different UTC offsets.
    const targetUtcPlus2 = '2026-06-02T02:00:00.000+02:00';
    const targetUtcMinus5 = '2026-06-01T19:00:00.000-05:00';

    const a = service.getTimeParts(targetUtcPlus2, now);
    const b = service.getTimeParts(targetUtcMinus5, now);

    expect(a.totalMs).toBe(b.totalMs);
  });

  it('is unaffected by a daylight-saving transition between now and the target date', () => {
    // Europe/Berlin moved clocks forward on 2026-03-29; the elapsed wall-clock day count
    // still must reflect real elapsed milliseconds, not a naive 24h-per-day assumption.
    const now = new Date('2026-03-28T00:00:00.000Z');
    const target = new Date('2026-03-30T00:00:00.000Z');

    const parts = service.getTimeParts(target, now);

    expect(parts.days).toBe(2);
    expect(parts.totalMs).toBe(2 * 24 * 60 * 60 * 1000);
  });

  it('formats a target date for display in a specific IANA timezone', () => {
    const target = new Date('2026-01-01T12:00:00.000Z');
    const formatted = service.formatInTimeZone(target, 'UTC');
    expect(formatted).toContain('2026');
  });
});
