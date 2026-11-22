import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { CountdownStoreService } from '../../core/services/countdown-store.service';

describe('DashboardComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideRouter([])],
    });
  });

  afterEach(() => localStorage.clear());

  it('shows the empty state when there are no countdowns', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.empty-state')).toBeTruthy();
    expect(compiled.textContent).toContain('No countdowns yet');
  });

  it('renders stats and an upcoming countdown card once one exists', () => {
    const store = TestBed.inject(CountdownStoreService);
    store.create({
      title: 'Ship the release',
      targetDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      timeZone: 'UTC',
      category: 'work',
    });

    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.empty-state')).toBeFalsy();
    expect(compiled.textContent).toContain('Ship the release');
    expect(compiled.querySelector('.stat-value')?.textContent?.trim()).toBe('1');
  });
});
