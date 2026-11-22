import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CountdownStoreService } from '../../core/services/countdown-store.service';
import { ReminderStoreService } from '../../core/services/reminder-store.service';
import { BrowserNotificationService } from '../../core/services/browser-notification.service';
import { NotificationPermissionService } from '../../core/services/notification-permission.service';
import { ReminderHistoryService } from '../../core/services/reminder-history.service';
import { REMINDER_PRESETS, Reminder, ReminderPreferences, ReminderType } from '../../domain/models/reminder.model';
import { fromDateTimeLocal, toDateTimeLocal } from '../../domain/models/reminder-time';

@Component({
  selector: 'app-reminders',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reminders.component.html',
  styleUrl: './reminders.component.scss',
})
export class RemindersComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  protected readonly countdownStore = inject(CountdownStoreService);
  protected readonly reminderStore = inject(ReminderStoreService);
  protected readonly reminderHistory = inject(ReminderHistoryService);
  protected readonly notifications = inject(BrowserNotificationService);
  private readonly notificationPermission = inject(NotificationPermissionService);
  protected readonly presets = REMINDER_PRESETS;
  protected readonly message = signal('');
  protected readonly editingId = signal<string | null>(null);
  protected readonly preferences = this.reminderStore.preferences;
  protected readonly zones = [...new Set(['UTC', Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'])];
  protected readonly form = this.fb.nonNullable.group({
    countdownId: ['', Validators.required], milestoneId: [''], title: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', Validators.maxLength(280)], scheduledLocal: ['', Validators.required], timeZone: [this.zones[1] ?? 'UTC', Validators.required],
    type: ['custom' as ReminderType], enabled: [true], allowDuplicate: [false],
  });

  ngOnInit(): void {
    this.notifications.startForegroundChecks();
  }

  protected get selectedCountdown() {
    return this.countdownStore.byId(this.form.controls.countdownId.value);
  }

  protected get selectedMilestones() {
    return this.selectedCountdown?.milestones ?? [];
  }

  protected onCountdownChange(): void {
    const countdown = this.selectedCountdown;
    if (countdown) {
      this.form.controls.timeZone.setValue(countdown.timeZone);
      if (!this.zones.includes(countdown.timeZone)) this.zones.push(countdown.timeZone);
      this.form.controls.milestoneId.setValue('');
    }
  }

  protected applyPreset(days: number | null): void {
    const countdown = this.selectedCountdown;
    if (!countdown || days === null) return;
    try {
      const targetLocal = toDateTimeLocal(countdown.targetDate, countdown.timeZone);
      const [date, time] = targetLocal.split('T');
      const calendarDay = new Date(`${date}T00:00:00Z`);
      calendarDay.setUTCDate(calendarDay.getUTCDate() - days);
      const dayString = calendarDay.toISOString().slice(0, 10);
      const scheduleLocal = `${dayString}T${time}`;
      const scheduledAt = fromDateTimeLocal(scheduleLocal, countdown.timeZone);
      this.form.controls.timeZone.setValue(countdown.timeZone);
      if (!this.zones.includes(countdown.timeZone)) this.zones.push(countdown.timeZone);
      this.form.controls.scheduledLocal.setValue(toDateTimeLocal(scheduledAt, countdown.timeZone));
      const milestone = countdown.milestones.find((item) => item.offsetDays === days);
      this.form.controls.milestoneId.setValue(milestone?.id ?? '');
      this.form.controls.type.setValue(milestone ? 'milestone' : 'countdown');
      this.form.controls.title.setValue(milestone?.title ? `Milestone: ${milestone.title}` : `Deadline in ${days} days`);
    } catch (error) {
      this.message.set(error instanceof Error ? error.message : 'Could not apply this schedule.');
    }
  }

  protected async enableNotifications(): Promise<void> {
    const permission = await this.notificationPermission.requestPermission();
    if (permission === 'granted') {
      this.savePreferences({ ...this.preferences(), notificationsEnabled: true });
      this.message.set('Browser notifications enabled for this device.');
    } else if (permission === 'denied') {
      this.message.set('Notifications are blocked. Change this site’s permission in your browser settings.');
    } else this.message.set('Browser notifications are not supported here.');
  }

  protected toggleDaily(enabled: boolean): void {
    this.savePreferences({ ...this.preferences(), dailyReminderEnabled: enabled });
  }

  protected updateDailyTime(time: string): void {
    this.savePreferences({ ...this.preferences(), dailyReminderTime: time });
  }

  protected updatePreferenceZone(timeZone: string): void {
    this.savePreferences({ ...this.preferences(), timeZone });
  }

  protected disableNotifications(): void {
    this.savePreferences({ ...this.preferences(), notificationsEnabled: false });
  }

  protected submit(): void {
    this.message.set('');
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue();
    try {
      const data = {
        countdownId: value.countdownId,
        ...(value.milestoneId ? { milestoneId: value.milestoneId } : {}),
        title: value.title.trim(), description: value.description.trim(),
        scheduledAt: fromDateTimeLocal(value.scheduledLocal, value.timeZone), timeZone: value.timeZone,
        type: value.type, enabled: value.enabled,
      };
      const id = this.editingId();
      if (id) this.reminderStore.update(id, data, value.allowDuplicate);
      else this.reminderStore.create(data, value.allowDuplicate);
      this.message.set(id ? 'Reminder updated.' : 'Reminder saved on this device.');
      this.resetForm();
    } catch (error) {
      this.message.set(error instanceof Error ? error.message : 'Could not save this reminder.');
    }
  }

  protected edit(reminder: Reminder): void {
    this.editingId.set(reminder.id);
    if (!this.zones.includes(reminder.timeZone)) this.zones.push(reminder.timeZone);
    this.form.patchValue({ countdownId: reminder.countdownId, milestoneId: reminder.milestoneId ?? '', title: reminder.title,
      description: reminder.description ?? '', scheduledLocal: toDateTimeLocal(reminder.scheduledAt, reminder.timeZone),
      timeZone: reminder.timeZone, type: reminder.type, enabled: reminder.enabled, allowDuplicate: false });
  }

  protected delete(reminder: Reminder): void {
    if (window.confirm(`Delete “${reminder.title}”?`)) this.reminderStore.delete(reminder.id);
  }

  protected setEnabled(reminder: Reminder, enabled: boolean): void {
    this.reminderStore.setEnabled(reminder.id, enabled);
  }

  protected resetForm(): void {
    this.editingId.set(null);
    this.form.reset({ countdownId: '', milestoneId: '', title: '', description: '', scheduledLocal: '', timeZone: this.zones[1] ?? 'UTC', type: 'custom', enabled: true, allowDuplicate: false });
  }

  protected countdownTitle(id: string): string {
    return this.countdownStore.byId(id)?.title ?? 'Countdown no longer available';
  }

  protected formatDate(reminder: Reminder): string {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: reminder.timeZone }).format(new Date(reminder.scheduledAt));
  }

  private savePreferences(preferences: ReminderPreferences): void {
    this.reminderStore.savePreferences(preferences);
  }
}