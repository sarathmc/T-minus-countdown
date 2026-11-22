import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Accessible modal confirmation dialog used before destructive actions
 * (delete countdown, delete milestone, archive, etc.).
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open) {
      <div class="backdrop" (click)="cancel.emit()">
        <div
          class="dialog"
          role="alertdialog"
          aria-modal="true"
          [attr.aria-labelledby]="titleId"
          [attr.aria-describedby]="descId"
          (click)="$event.stopPropagation()"
        >
          <h2 [id]="titleId">{{ title }}</h2>
          <p [id]="descId">{{ message }}</p>
          <div class="actions">
            <button type="button" class="btn btn-ghost" (click)="cancel.emit()">
              {{ cancelLabel }}
            </button>
            <button type="button" class="btn btn-danger" (click)="confirm.emit()">
              {{ confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .backdrop {
        position: fixed;
        inset: 0;
        background: rgba(17, 19, 26, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100;
        padding: var(--space-4);
      }

      .dialog {
        background: var(--color-surface);
        border-radius: var(--radius-lg);
        padding: var(--space-5);
        max-width: 26rem;
        width: 100%;
        box-shadow: var(--shadow-md);
      }

      .actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--space-3);
        margin-top: var(--space-5);
      }
    `,
  ],
})
export class ConfirmDialogComponent {
  @Input() open = false;
  @Input() title = 'Are you sure?';
  @Input() message = 'This action cannot be undone.';
  @Input() confirmLabel = 'Confirm';
  @Input() cancelLabel = 'Cancel';

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  readonly titleId = `confirm-dialog-title-${Math.random().toString(36).slice(2)}`;
  readonly descId = `confirm-dialog-desc-${Math.random().toString(36).slice(2)}`;
}
