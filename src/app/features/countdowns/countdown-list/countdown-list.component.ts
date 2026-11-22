import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CountdownStoreService } from '../../../core/services/countdown-store.service';
import { CountdownStatus } from '../../../domain/models/countdown.model';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { CountdownTimerComponent } from '../../../shared/components/countdown-timer/countdown-timer.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

type StatusFilter = CountdownStatus | 'all';

@Component({
  selector: 'app-countdown-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, EmptyStateComponent, CountdownTimerComponent, ConfirmDialogComponent],
  templateUrl: './countdown-list.component.html',
  styleUrl: './countdown-list.component.scss',
})
export class CountdownListComponent {
  protected readonly store = inject(CountdownStoreService);

  protected readonly filter = signal<StatusFilter>('all');
  protected readonly pendingDeleteId = signal<string | null>(null);

  protected readonly filters: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'paused', label: 'Paused' },
    { id: 'archived', label: 'Archived' },
  ];

  protected filtered() {
    const filter = this.filter();
    const all = this.store.countdowns();
    return filter === 'all' ? all : all.filter((c) => c.status === filter);
  }

  protected setFilter(filter: StatusFilter): void {
    this.filter.set(filter);
  }

  protected duplicate(id: string): void {
    this.store.duplicate(id);
  }

  protected togglePause(id: string, current: CountdownStatus): void {
    this.store.setStatus(id, current === 'paused' ? 'active' : 'paused');
  }

  protected archive(id: string): void {
    this.store.setStatus(id, 'archived');
  }

  protected requestDelete(id: string): void {
    this.pendingDeleteId.set(id);
  }

  protected cancelDelete(): void {
    this.pendingDeleteId.set(null);
  }

  protected confirmDelete(): void {
    const id = this.pendingDeleteId();
    if (id) {
      this.store.remove(id);
    }
    this.pendingDeleteId.set(null);
  }
}
