import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, signal, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { BrowserNotificationService } from './core/services/browser-notification.service';
import { SyncQueueService } from './core/services/sync-queue.service';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private readonly updates = inject(SwUpdate, { optional: true });
  private readonly notifications = inject(BrowserNotificationService);
  private readonly syncQueue = inject(SyncQueueService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly online = signal(typeof navigator === 'undefined' || navigator.onLine);
  protected readonly updateReady = signal(false);
  protected readonly menuOpen = signal(false);

  constructor() {
    this.notifications.startForegroundChecks();
    const onOnline = () => { this.online.set(true); void this.syncQueue.flush().catch(() => undefined); };
    const onOffline = () => this.online.set(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    });
    if (this.updates?.isEnabled) {
      this.updates.versionUpdates.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
        if (event.type === 'VERSION_READY') this.updateReady.set(true);
      });
    }
  }

  protected reloadForUpdate(): void {
    void this.updates?.activateUpdate().then(() => document.location.reload());
  }
  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  protected closeMenuOnEscape(): void {
    if (this.menuOpen()) this.closeMenu();
  }

  protected readonly navLinks = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Countdowns', path: '/countdowns' },
    { label: 'Reminders', path: '/reminders' },
    { label: 'Theme Studio', path: '/theme-studio' },
    { label: 'Backup', path: '/settings/backup' },
    { label: 'Account', path: '/account' },
  ];
}
