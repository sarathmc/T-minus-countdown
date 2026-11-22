import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Input,
  OnChanges,
  inject,
  signal,
} from '@angular/core';
import { CountdownCalculatorService } from '../../../core/services/countdown-calculator.service';
import { CountdownTimeParts } from '../../../domain/models/countdown.model';
import { formatTimePartsForScreenReader } from '../../utils/time-remaining.util';

/**
 * Live, accessible countdown ticker.
 *
 * Renders digits visually every second but only pushes an update into the
 * `aria-live` region once a minute, so screen reader users get a meaningful
 * summary instead of being spammed every second.
 */
@Component({
  selector: 'app-countdown-timer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="timer" [class.timer-compact]="compact">
      <div class="segments" aria-hidden="true">
        <div class="segment">
          <span class="value">{{ parts().days }}</span>
          <span class="label">days</span>
        </div>
        <div class="segment">
          <span class="value">{{ parts().hours }}</span>
          <span class="label">hrs</span>
        </div>
        <div class="segment">
          <span class="value">{{ parts().minutes }}</span>
          <span class="label">min</span>
        </div>
        @if (!compact) {
          <div class="segment">
            <span class="value">{{ parts().seconds }}</span>
            <span class="label">sec</span>
          </div>
        }
      </div>
      <span class="visually-hidden" aria-live="polite">{{ liveMessage() }}</span>
      @if (parts().isPast) {
        <p class="past-label">This deadline has passed.</p>
      }
    </div>
  `,
  styles: [
    `
      .segments {
        display: flex;
        gap: var(--space-4);
      }

      .segment {
        display: flex;
        flex-direction: column;
        align-items: center;
        min-width: 3rem;
      }

      .value {
        font-size: var(--font-size-2xl);
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }

      .timer-compact .value {
        font-size: var(--font-size-lg);
      }

      .label {
        font-size: var(--font-size-xs);
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .past-label {
        color: var(--color-danger);
        font-weight: 600;
        margin-top: var(--space-2);
      }
    `,
  ],
})
export class CountdownTimerComponent implements OnChanges {
  @Input({ required: true }) targetDate!: string;
  @Input() compact = false;

  private readonly calculator = inject(CountdownCalculatorService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly parts = signal<CountdownTimeParts>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalMs: 0,
    isPast: false,
  });
  protected readonly liveMessage = signal('');

  private intervalId?: ReturnType<typeof setInterval>;
  private lastAnnouncedMinute = -1;

  ngOnChanges(): void {
    this.tick();
    this.startTicking();
  }

  private startTicking(): void {
    if (this.intervalId) {
      return;
    }
    this.intervalId = setInterval(() => this.tick(), 1000);
    this.destroyRef.onDestroy(() => clearInterval(this.intervalId));
  }

  private tick(): void {
    const next = this.calculator.getTimeParts(this.targetDate);
    this.parts.set(next);

    const minuteBucket = next.days * 24 * 60 + next.hours * 60 + next.minutes;
    if (minuteBucket !== this.lastAnnouncedMinute) {
      this.lastAnnouncedMinute = minuteBucket;
      this.liveMessage.set(formatTimePartsForScreenReader(next));
    }
  }
}
