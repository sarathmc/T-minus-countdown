import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CountdownListComponent } from './countdown-list.component';
import { CountdownStoreService } from '../../../core/services/countdown-store.service';

describe('CountdownListComponent', () => {
  let store: CountdownStoreService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [CountdownListComponent],
      providers: [provideRouter([])],
    });
    store = TestBed.inject(CountdownStoreService);
  });

  afterEach(() => localStorage.clear());

  function futureIso(daysAhead = 10): string {
    return new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString();
  }

  it('shows the empty state when there are no countdowns at all', () => {
    const fixture = TestBed.createComponent(CountdownListComponent);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No countdowns yet');
  });

  it('filters the list by status', () => {
    const active = store.create({
      title: 'Active one',
      targetDate: futureIso(),
      timeZone: 'UTC',
      category: 'work',
    });
    const paused = store.create({
      title: 'Paused one',
      targetDate: futureIso(),
      timeZone: 'UTC',
      category: 'work',
    });
    store.setStatus(paused.id, 'paused');

    const fixture = TestBed.createComponent(CountdownListComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component['filtered']().length).toBe(2);

    component['setFilter']('paused');
    fixture.detectChanges();
    const rows = component['filtered']();
    expect(rows.length).toBe(1);
    expect(rows[0].id).toBe(paused.id);
    expect(rows.some((r) => r.id === active.id)).toBe(false);
  });

  it('opens a confirmation dialog before deleting and removes the countdown on confirm', () => {
    const countdown = store.create({
      title: 'To delete',
      targetDate: futureIso(),
      timeZone: 'UTC',
      category: 'other',
    });

    const fixture = TestBed.createComponent(CountdownListComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['requestDelete'](countdown.id);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.dialog')).toBeTruthy();

    component['confirmDelete']();
    expect(store.byId(countdown.id)).toBeUndefined();
  });
});
