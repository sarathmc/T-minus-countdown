import { Injectable, InjectionToken, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Reminder } from '../../domain/models/reminder.model';

export interface ReminderNotificationDelivery {
  deliver(reminder: Reminder): boolean;
}

@Injectable({ providedIn: 'root' })
export class BrowserNotificationDeliveryService implements ReminderNotificationDelivery {
  private readonly router = inject(Router);

  deliver(reminder: Reminder): boolean {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
    try {
      const notification = new Notification(reminder.title, {
        body: reminder.description || 'Your T-Minus reminder is due.',
        tag: `t-minus-reminder-${reminder.id}`,
        data: { countdownId: reminder.countdownId },
      });
      notification.onclick = () => {
        window.focus();
        void this.router.navigate(['/countdowns', reminder.countdownId]);
        notification.close();
      };
      return true;
    } catch {
      return false;
    }
  }
}

export const REMINDER_NOTIFICATION_DELIVERY = new InjectionToken<ReminderNotificationDelivery>('REMINDER_NOTIFICATION_DELIVERY', {
  providedIn: 'root',
  factory: () => inject(BrowserNotificationDeliveryService),
});