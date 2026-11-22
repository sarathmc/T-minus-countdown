import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CountdownStoreService } from '../../../core/services/countdown-store.service';
import {
  CountdownCategory,
  MilestonePresetId,
} from '../../../domain/models/countdown.model';

const CATEGORIES: CountdownCategory[] = [
  'personal',
  'work',
  'study',
  'travel',
  'health',
  'finance',
  'other',
];

const PRESETS: { id: MilestonePresetId; label: string; description: string }[] = [
  { id: 'standard', label: 'Standard', description: 'T-60, 30, 14, 7, 5, 3, 2, 1, 0' },
  { id: 'compact', label: 'Compact', description: 'T-14, 7, 3, 1, 0' },
  { id: 'light', label: 'Light', description: 'T-7, 3, 1, 0' },
];

/** Create or edit a countdown. In edit mode, the milestone preset is not re-applied. */
@Component({
  selector: 'app-countdown-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './countdown-form.component.html',
  styleUrl: './countdown-form.component.scss',
})
export class CountdownFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(CountdownStoreService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly categories = CATEGORIES;
  protected readonly presets = PRESETS;
  protected readonly serverError = signal<string | null>(null);

  private readonly editId = this.route.snapshot.paramMap.get('id');
  protected readonly isEditMode = computed(() => this.editId !== null);
  private readonly existing = this.editId ? this.store.byId(this.editId) : undefined;

  protected readonly form = this.fb.nonNullable.group({
    title: [this.existing?.title ?? '', [Validators.required, Validators.maxLength(64)]],
    description: [this.existing?.description ?? '', [Validators.maxLength(280)]],
    targetDate: [this.toLocalInputValue(this.existing?.targetDate), [Validators.required]],
    timeZone: [
      this.existing?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      [Validators.required],
    ],
    category: [this.existing?.category ?? ('personal' as CountdownCategory), [Validators.required]],
    milestonePreset: ['standard' as MilestonePresetId],
  });

  protected readonly timeZones = Intl.supportedValuesOf
    ? Intl.supportedValuesOf('timeZone')
    : [Intl.DateTimeFormat().resolvedOptions().timeZone];

  protected submit(): void {
    this.serverError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const targetDateIso = new Date(value.targetDate).toISOString();

    try {
      if (this.isEditMode() && this.editId) {
        this.store.update(this.editId, {
          title: value.title,
          description: value.description || undefined,
          targetDate: targetDateIso,
          timeZone: value.timeZone,
          category: value.category,
        });
        this.router.navigate(['/countdowns', this.editId]);
      } else {
        const created = this.store.create({
          title: value.title,
          description: value.description || undefined,
          targetDate: targetDateIso,
          timeZone: value.timeZone,
          category: value.category,
          milestonePreset: value.milestonePreset,
        });
        this.router.navigate(['/countdowns', created.id]);
      }
    } catch (error) {
      this.serverError.set(error instanceof Error ? error.message : 'Something went wrong.');
    }
  }

  protected cancel(): void {
    if (this.isEditMode() && this.editId) {
      this.router.navigate(['/countdowns', this.editId]);
    } else {
      this.router.navigate(['/countdowns']);
    }
  }

  private toLocalInputValue(iso: string | undefined): string {
    if (!iso) {
      return '';
    }
    const date = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}`;
  }
}
