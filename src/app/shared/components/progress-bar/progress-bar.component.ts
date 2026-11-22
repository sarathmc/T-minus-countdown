import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** Horizontal progress bar used for milestone completion. */
@Component({
  selector: 'app-progress-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="track"
      role="progressbar"
      [attr.aria-valuenow]="value"
      aria-valuemin="0"
      aria-valuemax="100"
      [attr.aria-label]="label"
    >
      <div class="fill" [style.width.%]="value"></div>
    </div>
    <span class="value">{{ value }}%</span>
  `,
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        gap: var(--space-3);
      }

      .track {
        flex: 1;
        height: 8px;
        border-radius: 999px;
        background: var(--color-border);
        overflow: hidden;
      }

      .fill {
        height: 100%;
        background: var(--color-primary);
        border-radius: inherit;
        transition: width 0.3s ease;
      }

      @media (prefers-reduced-motion: reduce) {
        .fill {
          transition: none;
        }
      }

      .value {
        font-size: var(--font-size-sm);
        color: var(--color-text-muted);
        min-width: 2.5rem;
        text-align: right;
      }
    `,
  ],
})
export class ProgressBarComponent {
  @Input() value = 0;
  @Input() label = 'Completion progress';
}
