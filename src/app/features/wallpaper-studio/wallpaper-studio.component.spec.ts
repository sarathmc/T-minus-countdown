import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { CountdownStoreService } from '../../core/services/countdown-store.service';
import { WallpaperStudioComponent } from './wallpaper-studio.component';

describe('WallpaperStudioComponent', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => localStorage.clear());

  function setup(id = '') {
    TestBed.resetTestingModule();
    const paramMap = new BehaviorSubject(convertToParamMap(id ? { countdownId: id } : {}));
    TestBed.configureTestingModule({
      imports: [WallpaperStudioComponent],
      providers: [provideRouter([]), {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: paramMap.value }, paramMap: paramMap.asObservable() },
      }],
    });
    const fixture = TestBed.createComponent(WallpaperStudioComponent);
    fixture.detectChanges();
    return { fixture, paramMap };
  }

  function createCountdown(title: string) {
    return TestBed.inject(CountdownStoreService).create({
      title, targetDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      timeZone: 'UTC', category: 'work',
    });
  }

  it('shows the selected countdown preview for an existing countdown', () => {
    const { fixture, paramMap } = setup();
    const countdown = createCountdown('Product launch');
    paramMap.next(convertToParamMap({ countdownId: countdown.id }));
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Product launch');
    expect((fixture.nativeElement as HTMLElement).querySelector('.wallpaper h3')?.textContent).toBe('Product launch');
  });

  it('switches the preview when the route selection changes', () => {
    const { fixture, paramMap } = setup();
    const first = createCountdown('First launch');
    const second = createCountdown('Second launch');

    paramMap.next(convertToParamMap({ countdownId: first.id }));
    fixture.detectChanges();
    paramMap.next(convertToParamMap({ countdownId: second.id }));
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.wallpaper h3')?.textContent).toBe('Second launch');
    expect((fixture.nativeElement as HTMLSelectElement).querySelector('select')?.value).toBe(second.id);
  });

  it('loads the first available countdown on direct Wallpaper Studio navigation', () => {
    const { fixture } = setup();
    const countdown = createCountdown('Direct entry');
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Direct entry');
    expect((fixture.nativeElement as HTMLSelectElement).querySelector('select')?.value).toBe(countdown.id);
  });

  it('falls back to another countdown after the selected countdown is deleted', () => {
    const { fixture, paramMap } = setup();
    const store = TestBed.inject(CountdownStoreService);
    const first = createCountdown('Deleted launch');
    const second = createCountdown('Remaining launch');

    paramMap.next(convertToParamMap({ countdownId: first.id }));
    fixture.detectChanges();
    store.remove(first.id);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Remaining launch');
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Countdown not found');
    expect((fixture.nativeElement as HTMLSelectElement).querySelector('select')?.value).toBe(second.id);
  });

  it('shows the empty state only when no countdowns are available', () => {
    const { fixture } = setup('missing');

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Create a countdown first');
  });

  it('applies template and customization changes to preview state', () => {
    const { fixture, paramMap } = setup();
    const countdown = createCountdown('Study exam');
    paramMap.next(convertToParamMap({ countdownId: countdown.id }));
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as {
      chooseTemplate: (id: 'gradient') => void;
      update: (key: 'format' | 'showTitle', value: 'desktop' | false) => void;
      options: () => { template: string; background: string; format: string; showTitle: boolean };
    };
    component.chooseTemplate('gradient');
    component.update('format', 'desktop');
    component.update('showTitle', false);
    expect(component.options()).toEqual(jasmine.objectContaining({ template: 'gradient', format: 'desktop', showTitle: false }));
    expect(component.options().background).toBe('#293d75');
  });
});