import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe, NgStyle } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CountdownStoreService } from '../../../core/services/countdown-store.service';
import { CountdownCalculatorService } from '../../../core/services/countdown-calculator.service';
import { MilestonePlannerService } from '../../../core/services/milestone-planner.service';
import { CountdownTimerComponent } from '../../../shared/components/countdown-timer/countdown-timer.component';
import { Countdown } from '../../../domain/models/countdown.model';
import { ProgressBarComponent } from '../../../shared/components/progress-bar/progress-bar.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { themeStyle as buildThemeStyle, themeForCountdown } from '../../../shared/utils/countdown-theme.util';

@Component({
  selector: 'app-countdown-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DatePipe,
    NgStyle,
    CountdownTimerComponent,
    ProgressBarComponent,
    ConfirmDialogComponent,
    EmptyStateComponent,
  ],
  templateUrl: './countdown-detail.component.html',
  styleUrl: './countdown-detail.component.scss',
})
export class CountdownDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly store = inject(CountdownStoreService);
  protected readonly calculator = inject(CountdownCalculatorService);
  protected readonly milestonePlanner = inject(MilestonePlannerService);

  private readonly id = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly countdown = computed(() => this.store.byId(this.id));
  protected readonly sortedMilestones = computed(() => {
    const countdown = this.countdown();
    return countdown ? this.milestonePlanner.sortByDate(countdown.milestones) : [];
  });
  protected readonly completion = computed(() => {
    const countdown = this.countdown();
    return countdown ? this.milestonePlanner.completionPercentage(countdown.milestones) : 0;
  });

  protected themeStyle(countdown: Countdown): Record<string, string> {
    return buildThemeStyle(themeForCountdown(countdown));
  }

  protected readonly showAddMilestone = signal(false);
  protected readonly milestoneError = signal<string | null>(null);
  protected readonly pendingDeleteMilestoneId = signal<string | null>(null);
  protected readonly pendingDeleteCountdown = signal(false);

  protected readonly milestoneForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(64)]],
    date: ['', [Validators.required]],
    description: ['', [Validators.maxLength(200)]],
  });

  protected toggleMilestone(milestoneId: string, done: boolean): void {
    this.store.setMilestoneDone(this.id, milestoneId, done);
  }

  protected requestDeleteMilestone(milestoneId: string): void {
    this.pendingDeleteMilestoneId.set(milestoneId);
  }

  protected cancelDeleteMilestone(): void {
    this.pendingDeleteMilestoneId.set(null);
  }

  protected confirmDeleteMilestone(): void {
    const milestoneId = this.pendingDeleteMilestoneId();
    if (milestoneId) {
      this.store.removeMilestone(this.id, milestoneId);
    }
    this.pendingDeleteMilestoneId.set(null);
  }

  protected openAddMilestone(): void {
    this.milestoneError.set(null);
    this.milestoneForm.reset({ title: '', date: '', description: '' });
    this.showAddMilestone.set(true);
  }

  protected submitMilestone(): void {
    if (this.milestoneForm.invalid) {
      this.milestoneForm.markAllAsTouched();
      return;
    }
    const value = this.milestoneForm.getRawValue();
    try {
      this.store.addMilestone(this.id, {
        title: value.title,
        date: new Date(value.date).toISOString(),
        description: value.description || undefined,
      });
      this.showAddMilestone.set(false);
      this.milestoneError.set(null);
    } catch (error) {
      this.milestoneError.set(error instanceof Error ? error.message : 'Could not add milestone.');
    }
  }

  protected cancelAddMilestone(): void {
    this.showAddMilestone.set(false);
    this.milestoneError.set(null);
  }

  protected duplicate(): void {
    const copy = this.store.duplicate(this.id);
    if (copy) {
      this.router.navigate(['/countdowns', copy.id]);
    }
  }

  protected togglePause(): void {
    const countdown = this.countdown();
    if (!countdown) {
      return;
    }
    this.store.setStatus(this.id, countdown.status === 'paused' ? 'active' : 'paused');
  }

  protected archive(): void {
    this.store.setStatus(this.id, 'archived');
  }

  protected requestDeleteCountdown(): void {
    this.pendingDeleteCountdown.set(true);
  }

  protected cancelDeleteCountdown(): void {
    this.pendingDeleteCountdown.set(false);
  }

  protected confirmDeleteCountdown(): void {
    this.store.remove(this.id);
    this.router.navigate(['/countdowns']);
  }
}
