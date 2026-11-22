import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** Reusable empty-state panel: icon-free, message + optional call-to-action slot. */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty-state" role="status">
      <h2>{{ title }}</h2>
      <p>{{ message }}</p>
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    `
      .empty-state {
        text-align: center;
        padding: var(--space-7) var(--space-5);
        border: 1px dashed var(--countdown-secondary-text, var(--color-border));
        border-radius: var(--radius-lg);
        background: var(--countdown-surface, var(--color-surface));
        color: var(--countdown-text, var(--color-text));
      }

      h2 {
        font-size: var(--font-size-lg);
      }

      p {
        color: var(--countdown-secondary-text, var(--color-text-muted));
        max-width: 32rem;
        margin-inline: auto;
      }
    `,
  ],
})
export class EmptyStateComponent {
  @Input() title = 'Nothing here yet';
  @Input() message = '';
}
