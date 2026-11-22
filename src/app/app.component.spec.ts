import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render primary navigation links', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const links = Array.from(compiled.querySelectorAll('.primary-nav a')).map(
      (a) => a.textContent?.trim()
    );
    expect(links).toContain('Dashboard');
    expect(links).toContain('Countdowns');
  });

  it('should render a skip link for keyboard users', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.skip-link')).toBeTruthy();
  });

  it('opens the mobile navigation and closes it with Escape', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const menuButton = compiled.querySelector('.menu-toggle') as HTMLButtonElement;
    const navigation = compiled.querySelector('.primary-nav') as HTMLElement;

    menuButton.click();
    fixture.detectChanges();
    expect(navigation.classList.contains('open')).toBeTrue();
    expect(menuButton.getAttribute('aria-expanded')).toBe('true');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(navigation.classList.contains('open')).toBeFalse();
    expect(menuButton.getAttribute('aria-expanded')).toBe('false');
  });
});
