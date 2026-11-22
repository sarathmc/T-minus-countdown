import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { CountdownStoreService } from '../../core/services/countdown-store.service';
import { WallpaperStudioComponent } from './wallpaper-studio.component';

describe('WallpaperStudioComponent', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => localStorage.clear());

  function setup(id: string) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [WallpaperStudioComponent],
      providers: [provideRouter([]), {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ countdownId: id }) } },
      }],
    });
    const fixture = TestBed.createComponent(WallpaperStudioComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('shows an empty state when there are no countdowns', () => {
    expect((setup('missing').nativeElement as HTMLElement).textContent).toContain('Create a countdown first');
  });

  it('handles a missing countdown id and binds a selected countdown', () => {
    const store = TestBed.inject(CountdownStoreService);
    store.create({
      title: 'Existing deadline', targetDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      timeZone: 'UTC', category: 'work',
    });
    expect((setup('unknown').nativeElement as HTMLElement).textContent).toContain('Countdown not found');
    const countdown = store.create({
      title: 'Product launch', targetDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      timeZone: 'UTC', category: 'work',
    });
    const fixture = setup(countdown.id);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Product launch');
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.template').length).toBe(5);
  });

  it('applies template and customization changes to preview state', () => {
    const store = TestBed.inject(CountdownStoreService);
    const countdown = store.create({ title: 'Study exam', targetDate: new Date(Date.now() + 86400000).toISOString(), timeZone: 'UTC', category: 'study' });
    const fixture = setup(countdown.id);
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