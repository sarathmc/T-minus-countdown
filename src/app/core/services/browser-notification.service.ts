import { DestroyRef, Injectable, inject } from '@angular/core';
import { REMINDER_NOTIFICATION_DELIVERY } from './browser-notification-delivery.service';
import { NotificationPermissionService } from './notification-permission.service';
import { ReminderHistoryService } from './reminder-history.service';
import { ReminderStoreService } from './reminder-store.service';

@Injectable({ providedIn: 'root' })
export class BrowserNotificationService {
  private readonly store = inject(ReminderStoreService);
  private readonly delivery = inject(REMINDER_NOTIFICATION_DELIVERY);
  private readonly permissionManager = inject(NotificationPermissionService);
  private readonly history = inject(ReminderHistoryService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly inFlight = new Set<string>();
  readonly permission = this.permissionManager.permission;
  readonly supported = this.permissionManager.supported;
  private timer?: ReturnType<typeof setInterval>;

  constructor() {
    this.destroyRef.onDestroy(() => this.stopForegroundChecks());
  }


  startForegroundChecks(): void {
    if (this.timer || typeof document === 'undefined') return;
    this.timer = setInterval(() => this.deliverDueReminders(), 30_000);
    this.deliverDueReminders();
  }

  stopForegroundChecks(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  private deliverDueReminders(): void {
    if (document.visibilityState !== 'visible' || !this.store.loaded() || !this.store.preferences().notificationsEnabled || this.permission() !== 'granted') return;
    const now = Date.now();
    for (const reminder of this.store.upcoming()) {
      if (Date.parse(reminder.scheduledAt) > now || this.inFlight.has(reminder.id)) continue;
      this.inFlight.add(reminder.id);
      try {
        if (this.delivery.deliver(reminder)) this.history.recordDelivered(reminder.id);
      } catch {
        // Keep reminders scheduled when a delivery adapter fails.
      } finally {
        this.inFlight.delete(reminder.id);
      }
    }
  }
}