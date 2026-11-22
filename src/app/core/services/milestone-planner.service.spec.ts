import { MilestonePlannerService } from './milestone-planner.service';

describe('MilestonePlannerService', () => {
  let service: MilestonePlannerService;
  const countdownId = 'cd-1';
  const targetDate = '2026-12-31T00:00:00.000Z';

  beforeEach(() => {
    service = new MilestonePlannerService();
  });

  it('generates the default T-60..T-0 milestone set for a long-term deadline', () => {
    const milestones = service.generateDefaultMilestones(countdownId, targetDate, 'standard');

    expect(milestones.map((m) => m.offsetDays)).toEqual([60, 30, 14, 7, 5, 3, 2, 1, 0]);
    expect(milestones.every((m) => m.countdownId === countdownId)).toBeTrue();
    expect(milestones.every((m) => m.done === false)).toBeTrue();
    expect(milestones.every((m) => m.isDefault)).toBeTrue();
  });

  it('generates only milestones that fit within a short-term deadline using the light preset', () => {
    const shortTarget = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const milestones = service.generateDefaultMilestones(countdownId, shortTarget, 'light');

    expect(milestones.map((m) => m.offsetDays)).toEqual([7, 3, 1, 0]);
  });

  it('does not create duplicate default milestones across multiple generations for the same input', () => {
    const first = service.generateDefaultMilestones(countdownId, targetDate, 'standard');
    const second = service.generateDefaultMilestones(countdownId, targetDate, 'standard');

    expect(first.map((m) => m.offsetDays)).toEqual(second.map((m) => m.offsetDays));
    expect(first.map((m) => m.date)).toEqual(second.map((m) => m.date));
  });

  it('rejects a custom milestone placed on a date that already has one', () => {
    const existing = service.generateDefaultMilestones(countdownId, targetDate, 'light');
    const duplicateDate = existing[0].date;

    expect(() =>
      service.addCustomMilestone(existing, countdownId, targetDate, {
        title: 'Duplicate check-in',
        date: duplicateDate,
      })
    ).toThrowError(/already exists/);
  });

  it('adds a valid custom milestone with a correctly derived offset', () => {
    const existing: ReturnType<MilestonePlannerService['generateDefaultMilestones']> = [];
    const customDate = new Date('2026-12-21T00:00:00.000Z').toISOString();

    const updated = service.addCustomMilestone(existing, countdownId, targetDate, {
      title: 'Draft review',
      date: customDate,
    });

    expect(updated.length).toBe(1);
    expect(updated[0].offsetDays).toBe(10);
    expect(updated[0].isDefault).toBeFalse();
  });

  it('rejects a custom milestone with an empty title', () => {
    expect(() =>
      service.addCustomMilestone([], countdownId, targetDate, { title: '   ', date: targetDate })
    ).toThrowError(/title is required/i);
  });

  it('toggles milestone completion without mutating the original array', () => {
    const milestones = service.generateDefaultMilestones(countdownId, targetDate, 'light');
    const targetId = milestones[0].id;

    const updated = service.setMilestoneDone(milestones, targetId, true);

    expect(milestones.find((m) => m.id === targetId)!.done).toBeFalse();
    expect(updated.find((m) => m.id === targetId)!.done).toBeTrue();
  });

  it('removes a milestone by id', () => {
    const milestones = service.generateDefaultMilestones(countdownId, targetDate, 'light');
    const updated = service.removeMilestone(milestones, milestones[0].id);
    expect(updated.length).toBe(milestones.length - 1);
  });

  it('computes 0% completion for an empty list and correct percentage otherwise', () => {
    expect(service.completionPercentage([])).toBe(0);

    const milestones = service.generateDefaultMilestones(countdownId, targetDate, 'light'); // 4 items
    const halfDone = service.setMilestoneDone(milestones, milestones[0].id, true);
    const quarterDone = service.setMilestoneDone(halfDone, milestones[1].id, true);

    expect(service.completionPercentage(quarterDone)).toBe(50);
  });

  it('sorts milestones chronologically regardless of input order', () => {
    const milestones = service.generateDefaultMilestones(countdownId, targetDate, 'standard');
    const shuffled = [...milestones].reverse();

    const sorted = service.sortByDate(shuffled);

    expect(sorted.map((m) => m.offsetDays)).toEqual([60, 30, 14, 7, 5, 3, 2, 1, 0]);
  });
});
