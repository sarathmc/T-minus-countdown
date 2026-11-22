import { Injectable, computed, signal } from '@angular/core';

export type NotificationSupport = 'unsupported' | NotificationPermission;

@Injectable({ providedIn: 'root' })
export class NotificationPermissionService {
  private readonly permissionState = signal<NotificationSupport>(
    notificationPermissionState(typeof Notification === 'undefined' ? undefined : Notification),
  );
  readonly permission = this.permissionState.asReadonly();
  readonly supported = computed(() => this.permissionState() !== 'unsupported');

  async requestPermission(): Promise<NotificationSupport> {
    if (!this.supported()) return 'unsupported';
    try {
      this.permissionState.set(await Notification.requestPermission());
    } catch {
      this.permissionState.set('denied');
    }
    return this.permissionState();
  }
}

export function notificationPermissionState(api: Pick<typeof Notification, 'permission'> | undefined): NotificationSupport {
  return api ? api.permission : 'unsupported';
}