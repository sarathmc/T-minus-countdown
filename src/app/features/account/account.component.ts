import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { CountdownStoreService } from '../../core/services/countdown-store.service';
import { SyncConflict, SyncQueueService } from '../../core/services/sync-queue.service';
import { PushSubscriptionService } from '../../core/services/push-subscription.service';

@Component({
  standalone: true,
  selector: 'app-account',
  imports: [FormsModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './account.component.scss',
  template: `
    <section class="account-page">
      <header class="page-heading account-heading">
        <p class="eyebrow">Account</p>
        <h1>Account and sync</h1>
        <p>Guest countdowns stay on this device. Sign in when you want to prepare local changes for synchronization.</p>
      </header>
      @if (auth.session(); as session) {
        <article class="card account-card">
          <div class="account-section account-intro">
            <p class="eyebrow">Connected account</p>
            <h2>Signed in as {{ session.email || session.userId }}</h2>
            <p>{{ store.countdowns().length }} local countdowns are available to prepare for migration.</p>
            <p class="status-message" role="status">{{ message() }}</p>
            <div class="account-actions">
              <button class="btn btn-primary" type="button" (click)="prepareMigration()">Review and queue local records</button>
              <button class="btn btn-secondary" type="button" (click)="auth.logout()">Sign out</button>
            </div>
          </div>

          <section class="account-section">
            <h3>Server notifications</h3>
            <p role="status">Permission: {{ push.permission() }}. {{ push.supported() ? (push.subscription() ? 'Subscription active.' : 'Not subscribed.') : 'Push is unsupported in this browser.' }}</p>
            <div class="account-actions">
              <button class="btn btn-secondary" type="button" (click)="enablePush()" [disabled]="!push.supported()">Enable server notifications</button>
              <button class="btn btn-secondary" type="button" (click)="disablePush()" [disabled]="!push.subscription()">Disable server notifications</button>
            </div>
          </section>

          <section class="account-section">
            <h3>Migration preview</h3>
            <ul class="migration-list">@for (item of store.countdowns(); track item.id) { <li>{{ item.title }} — {{ item.targetDate | date }}</li> }</ul>
            <div class="account-actions">
              <button class="btn btn-secondary" type="button" (click)="showQueue()">Show pending sync status</button>
              <button class="btn btn-secondary" type="button" (click)="retrySync()">Retry recoverable sync</button>
            </div>
            <p class="status-message" role="status">{{ summary() }}</p>
            @for (entry of queueEntries(); track entry.id) {
              <p class="queue-entry">{{ entry.resourceId }} · {{ entry.status }} · {{ entry.lastError || 'Waiting' }}</p>
            }
          </section>

          <section class="account-section">
            <h3>Conflicts requiring attention</h3>
            @for (conflict of conflicts(); track conflict.id) {
              <article class="conflict-card" aria-label="Synchronization conflict">
                <p><strong>{{ conflict.entity }}</strong> {{ conflict.resourceId }} · detected {{ conflict.detectedAt | date:'short' }}</p>
                <p>{{ conflict.remoteDeleted ? 'The remote record was deleted.' : 'The remote record changed.' }} Local revision: {{ conflict.localExpectedRevision ?? 'create' }}. Remote revision: {{ conflict.currentServerRevision ?? 'unavailable' }}.</p>
                <details><summary>Review local and remote versions</summary><pre>{{ conflict.localPendingVersion | json }}</pre><pre>{{ conflict.remoteServerVersion | json }}</pre></details>
                <div class="account-actions">
                  <button class="btn btn-secondary" type="button" (click)="resolve(conflict.id, 'keep-local')">Keep local version</button>
                  <button class="btn btn-secondary" type="button" (click)="resolve(conflict.id, 'keep-remote')">Keep remote version</button>
                </div>
                <label [for]="'manual-' + conflict.id">Manual resolved JSON</label>
                <textarea [id]="'manual-' + conflict.id" [ngModel]="manualDrafts[conflict.id] || ''" (ngModelChange)="manualDrafts[conflict.id] = $event"></textarea>
                <button class="btn btn-secondary" type="button" (click)="resolveManual(conflict)">Submit manual resolution</button>
              </article>
            } @empty { <p>No conflicts require attention.</p> }
          </section>
        </article>
      } @else {
        <form class="card account-card account-form" (submit)="submit($event)">
          <div class="account-section">
            <p class="eyebrow">Welcome back</p>
            <h2>Sign in to sync</h2>
            <p>Access your account while keeping guest countdowns safe on this device.</p>
          </div>
          <div class="form-field">
            <label for="email">Email</label>
            <input id="email" name="email" type="email" autocomplete="email" required [(ngModel)]="email">
          </div>
          <div class="form-field">
            <label for="password">Password</label>
            <input id="password" name="password" type="password" autocomplete="current-password" required [(ngModel)]="password">
          </div>
          <div class="account-actions">
            <button class="btn btn-primary" type="submit" (click)="mode.set('login')">Sign in</button>
            <button class="btn btn-secondary" type="submit" (click)="mode.set('register')">Create account</button>
          </div>
          <button class="link-button" type="button" (click)="resetPassword()">Forgot your password?</button>
          <p class="status-message" role="alert">{{ message() }}</p>
          <p class="guest-note">Guest mode remains available. Supabase must be configured by the application host.</p>
        </form>
      }
    </section>`
})
export class AccountComponent {
  readonly auth = inject(AuthService);
  readonly store = inject(CountdownStoreService);
  private readonly queue = inject(SyncQueueService);
  readonly push = inject(PushSubscriptionService);
  readonly mode = signal<'login' | 'register'>('login');
  readonly message = signal('');
  readonly queueEntries = signal<Awaited<ReturnType<SyncQueueService['list']>>>([]);
  readonly conflicts = signal<SyncConflict[]>([]);
  readonly summary = signal('No successful synchronization recorded.');
  manualDrafts: Record<string, string> = {};
  email = '';
  password = '';

  async submit(event: Event): Promise<void> {
    event.preventDefault();
    try {
      if (this.mode() === 'register') await this.auth.register(this.email, this.password);
      else await this.auth.login(this.email, this.password);
      this.password = '';
      this.message.set('Signed in. Local data has not been removed.');
    } catch (error) { this.message.set(error instanceof Error ? error.message : 'Authentication failed.'); }
  }

  async resetPassword(): Promise<void> {
    if (!this.email.trim()) { this.message.set('Enter your email address first.'); return; }
    try { await this.auth.resetPassword(this.email); this.message.set('If the account exists, a reset email will be sent.'); }
    catch (error) { this.message.set(error instanceof Error ? error.message : 'Password reset failed.'); }
  }

  async enablePush(): Promise<void> {
    try { await this.push.enable(); this.message.set('Server notifications enabled for this browser.'); }
    catch (error) { this.message.set(error instanceof Error ? error.message : 'Could not enable server notifications.'); }
  }

  async disablePush(): Promise<void> {
    try { await this.push.disable(); this.message.set('Server notifications disabled for this browser.'); }
    catch (error) { this.message.set(error instanceof Error ? error.message : 'Could not disable server notifications.'); }
  }

  async prepareMigration(): Promise<void> {
    try {
      const count = await this.queue.prepareGuestMigration(this.store.countdowns());
      this.message.set(`${count} local record(s) added to the durable queue; source records remain on this device.`);
      await this.showQueue();
    } catch { this.message.set('Could not access the local sync queue. Your countdown records were not changed.'); }
  }

  async showQueue(): Promise<void> {
    this.queueEntries.set(await this.queue.list());
    this.conflicts.set(await this.queue.listConflicts());
    const lastSuccessful = await this.queue.lastSuccessfulSync();
    this.summary.set(lastSuccessful ? `Last successful synchronization: ${new Date(lastSuccessful).toLocaleString()}.` : 'No successful synchronization recorded.');
  }

  async retrySync(): Promise<void> {
    try { await this.queue.recoverFailed(); await this.queue.flush(); await this.showQueue(); this.message.set('Synchronization checked; conflicts remain paused until resolved.'); }
    catch { this.message.set('Sync attempt failed; queued records are retained for retry.'); }
  }

  async resolve(id: string, resolution: 'keep-local' | 'keep-remote'): Promise<void> {
    try {
      await this.queue.resolveConflict(id, resolution);
      await this.showQueue();
      this.message.set(resolution === 'keep-local' ? 'Local version was rebased on the remote revision.' : 'Remote version was applied locally.');
    } catch (error) { this.message.set(error instanceof Error ? error.message : 'Conflict resolution failed.'); }
  }

  async resolveManual(conflict: SyncConflict): Promise<void> {
    try {
      const payload = JSON.parse(this.manualDrafts[conflict.id] || '');
      await this.queue.resolveConflict(conflict.id, 'manual', payload);
      await this.showQueue();
      this.message.set('Manual resolution was queued with a new idempotency key.');
    } catch (error) { this.message.set(error instanceof Error ? error.message : 'Manual resolution must be valid JSON.'); }
  }
}