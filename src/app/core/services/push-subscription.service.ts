import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CLOUD_CONFIG } from './cloud-config';
import { NotificationPermissionService } from './notification-permission.service';

export interface RegisteredPushSubscription {
  id: string;
  endpoint: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class PushSubscriptionService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(CLOUD_CONFIG);
  private readonly permissionManager = inject(NotificationPermissionService);
  private readonly _subscription = signal<RegisteredPushSubscription | undefined>(undefined);
  readonly subscription = this._subscription.asReadonly();
  readonly permission = this.permissionManager.permission;
  readonly supported = signal(typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window);

  async enable(): Promise<RegisteredPushSubscription> {
    if (!this.supported()) throw new Error('Push notifications are not supported by this browser.');
    if (!this.config.apiUrl || !this.config.vapidPublicKey) throw new Error('Server push notifications are not configured.');
    const permission = await this.permissionManager.requestPermission();
    if (permission !== 'granted') throw new Error(`Notification permission is ${permission}.`);
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const browserSubscription = existing ?? await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeBase64Url(this.config.vapidPublicKey),
    });
    const json = browserSubscription.toJSON();
    if (!json.endpoint || !json.keys?.['p256dh'] || !json.keys['auth']) throw new Error('The browser returned an incomplete push subscription.');
    const saved = await firstValueFrom(this.http.post<RegisteredPushSubscription>(`${this.config.apiUrl}/api/push/subscriptions`, {
      endpoint: json.endpoint, p256dh: json.keys['p256dh'], auth: json.keys['auth'],
    }));
    this._subscription.set(saved);
    return saved;
  }

  async disable(): Promise<void> {
    if (!this.config.apiUrl) return;
    const subscriptions = await firstValueFrom(this.http.get<RegisteredPushSubscription[]>(`${this.config.apiUrl}/api/push/subscriptions`));
    await Promise.all(subscriptions.map((subscription) => firstValueFrom(this.http.delete(`${this.config.apiUrl}/api/push/subscriptions/${subscription.id}`))));
    const registration = await navigator.serviceWorker?.ready;
    const browserSubscription = await registration?.pushManager.getSubscription();
    if (browserSubscription) await browserSubscription.unsubscribe();
    this._subscription.set(undefined);
  }
}

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
