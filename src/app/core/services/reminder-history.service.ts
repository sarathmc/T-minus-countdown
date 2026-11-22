import { Injectable, computed, inject } from '@angular/core';
import { ReminderStoreService } from './reminder-store.service';

@Injectable({ providedIn: 'root' })
export class ReminderHistoryService {
  private readonly store = inject(ReminderStoreService);
  readonly history = computed(() => this.store.reminders()
    .filter((reminder) => reminder.deliveryStatus === 'delivered' || reminder.deliveryStatus === 'expired')
    .sort((a, b) => Date.parse(b.scheduledAt) - Date.parse(a.scheduledAt)));

  recordDelivered(reminderId: string): void {
    this.store.markDelivered(reminderId);
  }
}