import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CountdownStoreService } from '../../core/services/countdown-store.service';
import { Countdown } from '../../domain/models/countdown.model';
import { isCountdownRecord } from '../../core/services/countdown-repository';

@Component({
  selector: 'app-data-backup',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card backup" aria-labelledby="backup-title">
      <p class="eyebrow">YOUR DATA</p><h1 id="backup-title">Backup & restore</h1>
      <p>Export a JSON copy of countdowns and milestones stored on this device.</p>
      <button class="btn btn-primary" type="button" (click)="exportData()">Export countdowns</button>
      <label class="import-label">Import a JSON backup
        <input type="file" accept="application/json,.json" (change)="importData($event)">
      </label>
      @if (message()) { <p role="status" aria-live="polite">{{ message() }}</p> }
    </section>
  `,
  styles: [`:host{display:block}.backup{max-width:42rem;margin:auto;padding:2rem}.eyebrow{color:var(--color-primary);font-size:.75rem;font-weight:700;letter-spacing:.12em}.import-label{display:grid;gap:.5rem;margin-top:1.5rem;font-weight:600}.import-label input{margin-top:.25rem}`],
})
export class DataBackupComponent {
  private readonly store = inject(CountdownStoreService);
  protected readonly message = signal('');

  protected exportData(): void {
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), countdowns: this.store.countdowns() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `t-minus-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    this.message.set('Backup downloaded. Keep it somewhere safe.');
  }

  protected async importData(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const values = Array.isArray(parsed) ? parsed : (parsed as { countdowns?: unknown })?.countdowns;
      if (!Array.isArray(values) || !values.length || !values.every(isCountdownRecord)) throw new Error('This file is not a valid T-Minus backup.');
      if (!window.confirm(`Import ${values.length} countdown(s)? Existing countdowns will be preserved; matching IDs will be skipped.`)) return;
      const added = this.store.import(values as Countdown[]);
      this.message.set(`Imported ${added} countdown(s); existing IDs were left unchanged.`);
    } catch (error) {
      this.message.set(error instanceof Error ? error.message : 'Could not read this backup file.');
    } finally {
      input.value = '';
    }
  }
}