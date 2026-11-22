import { TestBed } from '@angular/core/testing';
import { CountdownStoreService } from './countdown-store.service';

describe('CountdownStoreService', () => {
  let service: CountdownStoreService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(CountdownStoreService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  function futureIso(daysAhead = 10): string {
    return new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString();
  }

  it('starts empty when localStorage has nothing stored', () => {
    expect(service.total()).toBe(0);
    expect(service.countdowns()).toEqual([]);
  });

  it('creates a countdown and persists it to localStorage', () => {
    const created = service.create({
      title: 'Launch day',
      targetDate: futureIso(),
      timeZone: 'UTC',
      category: 'work',
    });

    expect(service.total()).toBe(1);
    expect(service.byId(created.id)?.title).toBe('Launch day');

    const stored = JSON.parse(localStorage.getItem('t-minus.countdowns.v1') ?? '[]');
    expect(stored.length).toBe(1);
    expect(stored[0].id).toBe(created.id);
  });

  it('updates a countdown title and bumps updatedAt', async () => {
    const created = service.create({
      title: 'Original',
      targetDate: futureIso(),
      timeZone: 'UTC',
      category: 'personal',
    });
    const originalUpdatedAt = created.updatedAt;

    await new Promise((resolve) => setTimeout(resolve, 5));
    service.update(created.id, { title: 'Renamed' });

    const updated = service.byId(created.id);
    expect(updated?.title).toBe('Renamed');
    expect(updated?.updatedAt).not.toBe(originalUpdatedAt);
  });

  it('removes a countdown', () => {
    const created = service.create({
      title: 'Temporary',
      targetDate: futureIso(),
      timeZone: 'UTC',
      category: 'other',
    });
    service.remove(created.id);
    expect(service.byId(created.id)).toBeUndefined();
    expect(service.total()).toBe(0);
  });

  it('duplicates a countdown with a new id and reset milestone completion', () => {
    const created = service.create({
      title: 'Conference',
      targetDate: futureIso(30),
      timeZone: 'UTC',
      category: 'work',
    });
    service.setMilestoneDone(created.id, created.milestones[0].id, true);

    const copy = service.duplicate(created.id);

    expect(copy).toBeDefined();
    expect(copy!.id).not.toBe(created.id);
    expect(copy!.milestones.every((m) => !m.done)).toBe(true);
    expect(service.total()).toBe(2);
  });

  it('classifies countdowns by status via active/paused/archived computed signals', () => {
    const created = service.create({
      title: 'Status check',
      targetDate: futureIso(),
      timeZone: 'UTC',
      category: 'personal',
    });

    expect(service.active().some((c) => c.id === created.id)).toBe(true);

    service.setStatus(created.id, 'paused');
    expect(service.paused().some((c) => c.id === created.id)).toBe(true);
    expect(service.active().some((c) => c.id === created.id)).toBe(false);

    service.setStatus(created.id, 'archived');
    expect(service.archived().some((c) => c.id === created.id)).toBe(true);
  });

  it('adds, toggles and removes a custom milestone on a countdown', () => {
    const created = service.create({
      title: 'Milestone test',
      targetDate: futureIso(60),
      timeZone: 'UTC',
      category: 'study',
    });
    const countBefore = created.milestones.length;

    service.addMilestone(created.id, {
      title: 'Custom checkpoint',
      date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    });
    let current = service.byId(created.id)!;
    expect(current.milestones.length).toBe(countBefore + 1);

    const custom = current.milestones.find((m) => m.title === 'Custom checkpoint')!;
    service.setMilestoneDone(created.id, custom.id, true);
    current = service.byId(created.id)!;
    expect(current.milestones.find((m) => m.id === custom.id)?.done).toBe(true);

    service.removeMilestone(created.id, custom.id);
    current = service.byId(created.id)!;
    expect(current.milestones.length).toBe(countBefore);
  });
});
