import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe, DecimalPipe, NgStyle } from '@angular/common';
import { CountdownStoreService } from '../../core/services/countdown-store.service';
import { CountdownCalculatorService } from '../../core/services/countdown-calculator.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { WallpaperExportService } from './wallpaper-export.service';
import { WallpaperOptions, WALLPAPER_TEMPLATES, wallpaperDimensions } from './wallpaper-studio.model';
import {
  COUNTDOWN_THEME_PRESETS,
  CountdownTheme,
  countdownThemeById,
  DEFAULT_COUNTDOWN_THEME,
} from '../../domain/models/countdown-theme.model';
import { themeForCountdown } from '../../shared/utils/countdown-theme.util';

const DEFAULT_OPTIONS: WallpaperOptions = {
  format: 'mobile', template: DEFAULT_COUNTDOWN_THEME.id, background: DEFAULT_COUNTDOWN_THEME.background,
  surface: DEFAULT_COUNTDOWN_THEME.surface, foreground: DEFAULT_COUNTDOWN_THEME.text,
  secondaryText: DEFAULT_COUNTDOWN_THEME.secondaryText,
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
  protected readonly themes = COUNTDOWN_THEME_PRESETS;
  protected readonly countdowns = this.store.countdowns;
  private readonly routeParamMap = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  protected readonly countdownId = computed(() => {
    const requestedId = this.routeParamMap().get('countdownId');
    const available = this.countdowns();
    return available.some((item) => item.id === requestedId) ? requestedId! : available[0]?.id ?? '';
  });
  protected readonly countdown = computed(() => this.store.byId(this.countdownId()));
  protected readonly options = signal<WallpaperOptions>(readWallpaperOptions());
  protected readonly time = signal(this.calculator.getTimeParts(this.countdown()?.targetDate ?? new Date()));
  protected readonly error = signal('');
  protected readonly message = signal('');
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
      '--wallpaper-title-size': `${this.titleScale()}`,
      'text-align': options.alignment,
    };
  });
  protected readonly titleScale = computed(() => {
    const titleLength = this.countdown()?.title.length ?? 0;
    return Math.max(0.34, Math.min(0.75, 0.75 - Math.max(0, titleLength - 24) * 0.012));
  });
  private loadedThemeCountdownId = '';

  constructor() {
    effect(() => {
      const countdown = this.countdown();
      if (!countdown || countdown.id === this.loadedThemeCountdownId) return;
      this.loadedThemeCountdownId = countdown.id;
      this.options.update((current) => ({ ...current, ...this.optionsForTheme(themeForCountdown(countdown)) }));
    });
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
    this.chooseTheme(id);
  }

  protected chooseTheme(id: WallpaperOptions['template']): void {
    const theme = countdownThemeById(id);
    this.options.update((current) => ({ ...current, ...this.optionsForTheme(theme) }));
  }

  protected applyTheme(): void {
    const countdown = this.countdown();
    if (!countdown) return;
    this.store.updateTheme(countdown.id, this.themeFromOptions(this.options()));
    this.message.set('Theme applied to this countdown.');
  }

  protected themeFromOptions(options: WallpaperOptions): CountdownTheme {
    const preset = countdownThemeById(options.template);
    return {
      ...preset,
      background: options.background,
      surface: options.surface ?? preset.surface,
      text: options.foreground,
      secondaryText: options.secondaryText ?? preset.secondaryText,
      accent: options.accent,
      digitFont: options.font,
      labelFont: options.font,
    };
  }

  protected selectCountdown(id: string): void {
    void this.router.navigate(['/theme-studio', id]);
  }

  protected reset(): void {
    const countdown = this.countdown();
    const theme = countdown ? themeForCountdown(countdown) : DEFAULT_COUNTDOWN_THEME;
    this.options.update((current) => ({ ...current, ...this.optionsForTheme(theme) }));
    this.error.set('');
    this.message.set('Theme draft reset to its defaults.');
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

  private optionsForTheme(theme: CountdownTheme): Partial<WallpaperOptions> {
    return {
      template: theme.id,
      background: theme.background,
      surface: theme.surface,
      foreground: theme.text,
      secondaryText: theme.secondaryText,
      accent: theme.accent,
      font: theme.digitFont,
    };
  }

  private persistOptions(): void {
    try { localStorage.setItem(WALLPAPER_OPTIONS_KEY, JSON.stringify(this.options())); } catch { /* Preferences remain available for this session. */ }
  }
}