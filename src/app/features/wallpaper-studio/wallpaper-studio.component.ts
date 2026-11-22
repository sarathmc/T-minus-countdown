import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe, DecimalPipe, NgStyle } from '@angular/common';
import { CountdownStoreService } from '../../core/services/countdown-store.service';
import { CountdownCalculatorService } from '../../core/services/countdown-calculator.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { WallpaperExportService } from './wallpaper-export.service';
import { WallpaperOptions, WALLPAPER_TEMPLATES, wallpaperDimensions } from './wallpaper-studio.model';

const DEFAULT_OPTIONS: WallpaperOptions = {
  format: 'mobile', template: 'minimal-light', background: '#f4f0e8', foreground: '#24231f',
  accent: '#a46b43', font: 'Georgia, serif', fontSize: 8, alignment: 'center',
  showTitle: true, showTimer: true, showDate: true, showMilestones: true,
};
const WALLPAPER_OPTIONS_KEY = 't-minus.wallpaper-options.v1';

function readWallpaperOptions(): WallpaperOptions {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(WALLPAPER_OPTIONS_KEY) ?? 'null');
    if (!saved || typeof saved !== 'object') return { ...DEFAULT_OPTIONS };
    const value = saved as Partial<WallpaperOptions>;
    if (!['mobile', 'desktop'].includes(value.format ?? '') ||
        !WALLPAPER_TEMPLATES.some((template) => template.id === value.template) ||
        !['left', 'center', 'right'].includes(value.alignment ?? '') ||
        typeof value.fontSize !== 'number' || value.fontSize < 4 || value.fontSize > 16 ||
        !['showTitle', 'showTimer', 'showDate', 'showMilestones'].every((key) => typeof value[key as keyof WallpaperOptions] === 'boolean')) {
      return { ...DEFAULT_OPTIONS };
    }
    return { ...DEFAULT_OPTIONS, ...value } as WallpaperOptions;
  } catch {
    return { ...DEFAULT_OPTIONS };
  }
}

@Component({
  selector: 'app-wallpaper-studio',
  standalone: true,
  imports: [DatePipe, DecimalPipe, NgStyle, EmptyStateComponent],
  templateUrl: './wallpaper-studio.component.html',
  styleUrl: './wallpaper-studio.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WallpaperStudioComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly store = inject(CountdownStoreService);
  private readonly calculator = inject(CountdownCalculatorService);
  private readonly exporter = inject(WallpaperExportService);

  protected readonly templates = WALLPAPER_TEMPLATES;
  protected readonly countdowns = this.store.countdowns;
  protected readonly countdownId = signal(this.route.snapshot.paramMap.get('countdownId') ?? '');
  protected readonly countdown = computed(() => this.store.byId(this.countdownId()));
  protected readonly options = signal<WallpaperOptions>(readWallpaperOptions());
  protected readonly time = signal(this.calculator.getTimeParts(this.countdown()?.targetDate ?? new Date()));
  protected readonly error = signal('');
  protected readonly exporting = signal(false);
  protected readonly dimensions = computed(() => wallpaperDimensions(this.options().format));
  protected readonly orderedMilestones = computed(() => [...(this.countdown()?.milestones ?? [])]
    .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4));
  protected readonly previewStyle = computed(() => {
    const options = this.options();
    const background = options.template === 'gradient'
      ? `linear-gradient(145deg, ${options.background}, ${options.accent})` : options.background;
    return {
      '--wallpaper-bg': background,
      '--wallpaper-fg': options.foreground,
      '--wallpaper-accent': options.accent,
      '--wallpaper-font': options.font,
      '--wallpaper-size': `${options.fontSize}cqw`,
      'text-align': options.alignment,
    };
  });

  constructor() {
    const interval = setInterval(() => {
      const countdown = this.countdown();
      if (countdown) this.time.set(this.calculator.getTimeParts(countdown.targetDate));
    }, 1000);
    this.destroyRef.onDestroy(() => clearInterval(interval));
  }

  protected update<K extends keyof WallpaperOptions>(key: K, value: WallpaperOptions[K]): void {
    this.options.update((current) => ({ ...current, [key]: value }));
    this.persistOptions();
  }

  protected chooseTemplate(id: WallpaperOptions['template']): void {
    const template = WALLPAPER_TEMPLATES.find((item) => item.id === id);
    if (template) this.options.update((current) => ({ ...current, template: id,
      background: template.background, foreground: template.foreground, accent: template.accent, font: template.font }));
    this.persistOptions();
  }

  protected selectCountdown(id: string): void {
    this.countdownId.set(id);
    void this.router.navigate(['/wallpaper-studio', id]);
  }

  protected reset(): void {
    this.options.set({ ...DEFAULT_OPTIONS });
    this.persistOptions();
    this.error.set('');
  }

  protected async download(): Promise<void> {
    const countdown = this.countdown();
    if (!countdown || this.exporting()) return;
    this.error.set('');
    this.exporting.set(true);
    try {
      const blob = await this.exporter.createPng(countdown, this.options());
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${countdown.title.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'countdown'}-${this.options().format}.png`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Wallpaper export failed. Please try again.');
    } finally {
      this.exporting.set(false);
    }
  }

  private persistOptions(): void {
    try { localStorage.setItem(WALLPAPER_OPTIONS_KEY, JSON.stringify(this.options())); } catch { /* Preferences remain available for this session. */ }
  }
}