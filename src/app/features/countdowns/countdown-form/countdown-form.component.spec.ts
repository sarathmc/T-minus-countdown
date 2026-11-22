import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { CountdownFormComponent } from './countdown-form.component';
import { CountdownStoreService } from '../../../core/services/countdown-store.service';

describe('CountdownFormComponent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => localStorage.clear());

  function setup(paramId: string | null = null) {
    TestBed.configureTestingModule({
      imports: [CountdownFormComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(paramId ? { id: paramId } : {}) } },
        },
      ],
    });
    const fixture = TestBed.createComponent(CountdownFormComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('is invalid without a title or target date', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    expect(component['form'].invalid).toBe(true);
  });

  it('creates a countdown through the store on valid submit and navigates to its detail page', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    const store = TestBed.inject(CountdownStoreService);
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');

    const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    const localValue = `${future.getFullYear()}-${pad(future.getMonth() + 1)}-${pad(
      future.getDate()
    )}T${pad(future.getHours())}:${pad(future.getMinutes())}`;

    component['form'].patchValue({ title: 'Big launch', targetDate: localValue });
    expect(component['form'].valid).toBe(true);

    component['submit']();

    expect(store.total()).toBe(1);
    expect(store.countdowns()[0].title).toBe('Big launch');
    expect(navigateSpy).toHaveBeenCalled();
  });

  it('does not submit when the form is invalid and instead marks fields as touched', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    const store = TestBed.inject(CountdownStoreService);

    component['submit']();

    expect(store.total()).toBe(0);
    expect(component['form'].controls.title.touched).toBe(true);
  });
});
