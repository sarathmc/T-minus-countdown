import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DatePipe, NgStyle } from '@angular/common';
import { Countdown } from '../../domain/models/countdown.model';
import { themeStyle as buildThemeStyle, themeForCountdown } from '../../shared/utils/countdown-theme.util';
import { RouterLink } from '@angular/router';
import { CountdownStoreService } from '../../core/services/countdown-store.service';
import { CountdownCalculatorService } from '../../core/services/countdown-calculator.service';
import { MilestonePlannerService } from '../../core/services/milestone-planner.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { CountdownTimerComponent } from '../../shared/components/countdown-timer/countdown-timer.component';
import { ProgressBarComponent } from '../../shared/components/progress-bar/progress-bar.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, NgStyle, EmptyStateComponent, CountdownTimerComponent, ProgressBarComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  protected readonly store = inject(CountdownStoreService);
  protected readonly calculator = inject(CountdownCalculatorService);
  protected readonly milestonePlanner = inject(MilestonePlannerService);

  protected completionFor(id: string): number {
    const countdown = this.store.byId(id);
    return countdown ? this.milestonePlanner.completionPercentage(countdown.milestones) : 0;
  }

  protected themeStyle(countdown: Countdown): Record<string, string> {
    return buildThemeStyle(themeForCountdown(countdown));
  }
}
