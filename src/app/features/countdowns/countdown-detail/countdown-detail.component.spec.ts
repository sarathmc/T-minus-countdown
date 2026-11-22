import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { CountdownDetailComponent } from './countdown-detail.component';
import { CountdownStoreService } from '../../../core/services/countdown-store.service';
import { Countdown } from '../../../domain/models/countdown.model';

describe('CountdownDetailComponent', () => {
  let store: CountdownStoreService;
  let countdown: Countdown;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    store = TestBed.inject(CountdownStoreService);
    countdown = store.create({
      title: 'Product launch',
      targetDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
      timeZone: 'UTC',
      category: 'work',
    });
  });

  afterEach(() => localStorage.clear());

  function setup(id: string) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [CountdownDetailComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id }) } } },
      ],
    });
    const fixture = TestBed.createComponent(CountdownDetailComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('shows a not-found empty state for an unknown id', () => {
    const fixture = setup('does-not-exist');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Countdown not found');
  });

  it('renders the countdown title and its default milestones', () => {
    const fixture = setup(countdown.id);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Product launch');
    expect(compiled.querySelectorAll('.milestone-row').length).toBe(countdown.milestones.length);
  });

  it('toggles a milestone done state through the store', () => {
    const fixture = setup(countdown.id);
    const component = fixture.componentInstance;
    const freshStore = TestBed.inject(CountdownStoreService);
    const milestoneId = countdown.milestones[0].id;

    component['toggleMilestone'](milestoneId, true);

    const updated = freshStore.byId(countdown.id);
    expect(updated?.milestones.find((m) => m.id === milestoneId)?.done).toBe(true);
  });
});
