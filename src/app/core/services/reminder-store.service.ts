import { Injectable, computed, inject, signal } from '@angular/core';
import { CountdownStoreService } from './countdown-store.service';
import { REMINDER_REPOSITORY } from './reminder-repository';
import { DEFAULT_REMINDER_PREFERENCES, Reminder, ReminderPreferences, isReminderRecord } from '../../domain/models/reminder.model';

@Injectable({ providedIn: 'root' })
export class ReminderStoreService {
  private readonly repository = inject(REMINDER_REPOSITORY);
  private readonly countdowns = inject(CountdownStoreService);
  private readonly _reminders = signal<Reminder[]>([]);
  private readonly _preferences = signal<ReminderPreferences>({ ...DEFAULT_REMINDER_PREFERENCES });
  private readonly _loaded = signal(false);
  private readonly _error = signal('');
  private writeQueue: Promise<void> = Promise.resolve();

  readonly reminders = this._reminders.asReadonly();
  readonly preferences = this._preferences.asReadonly();
  readonly loaded = this._loaded.asReadonly();
  readonly error = this._error.asReadonly();
  readonly scheduled = computed(() => this._reminders().filter((item) => item.deliveryStatus === 'scheduled')
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt)));
  readonly upcoming = computed(() => this.scheduled().filter((item) => item.enabled));

  constructor() {
    void Promise.all([this.repository.load(), this.repository.loadPreferences()]).then(([reminders, preferences]) => {
      this._reminders.set(reminders);
      this._preferences.set(preferences);
    }).catch(() => this._error.set('Reminder storage is unavailable. Changes will be kept for this session only.'))
      .finally(() => this._loaded.set(true));
  }

  create(input: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt' | 'deliveryStatus'>, allowDuplicate = false): Reminder {
    this.validateAssociation(input.countdownId, input.milestoneId);
    if (!isReminderRecord({ ...input, id: 'validation', deliveryStatus: 'scheduled', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })) {
      throw new Error('Reminder details are invalid. Check the title, date, and timezone.');
    }
    if (!allowDuplicate && input.milestoneId && this._reminders().some((item) => item.countdownId === input.countdownId && item.milestoneId === input.milestoneId && item.deliveryStatus !== 'cancelled')) {
      throw new Error('A reminder already exists for this milestone. Edit it or explicitly allow a duplicate.');
    }
    const now = new Date().toISOString();
    const reminder: Reminder = { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now,
      deliveryStatus: Date.parse(input.scheduledAt) <= Date.now() ? 'expired' : 'scheduled' };
    this._reminders.update((items) => [...items, reminder]);
    this.persist();
    return reminder;
  }

  update(id: string, changes: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt' | 'deliveryStatus'>, allowDuplicate = false): void {
    const original = this._reminders().find((item) => item.id === id);
    if (!original) throw new Error('This reminder no longer exists.');
    this.validateAssociation(changes.countdownId, changes.milestoneId);
    const duplicate = changes.milestoneId && this._reminders().some((item) => item.id !== id && item.countdownId === changes.countdownId && item.milestoneId === changes.milestoneId && item.deliveryStatus !== 'cancelled');
    if (duplicate && !allowDuplicate) throw new Error('A reminder already exists for this milestone.');
    const updated: Reminder = { ...changes, id, createdAt: original.createdAt, updatedAt: new Date().toISOString(),
      deliveryStatus: Date.parse(changes.scheduledAt) <= Date.now() ? 'expired' : 'scheduled' };
    if (!isReminderRecord(updated)) throw new Error('Reminder details are invalid.');
    this._reminders.update((items) => items.map((item) => item.id === id ? updated : item));
    this.persist();
  }

  delete(id: string): void {
    this._reminders.update((items) => items.filter((item) => item.id !== id));
    this.persist();
  }

  setEnabled(id: string, enabled: boolean): void {
    this._reminders.update((items) => items.map((item) => item.id === id ? { ...item, enabled, updatedAt: new Date().toISOString() } : item));
    this.persist();
  }

  markDelivered(id: string): void {
    this._reminders.update((items) => items.map((item) => item.id === id ? { ...item, deliveryStatus: 'delivered', updatedAt: new Date().toISOString() } : item));
    this.persist();
  }

  savePreferences(preferences: ReminderPreferences): void {
    this._preferences.set(preferences);
    this.writeQueue = this.writeQueue.then(() => this.repository.savePreferences(preferences))
      .catch(() => this._error.set('Could not save reminder preferences.'));
  }

  private validateAssociation(countdownId: string, milestoneId?: string): void {
    const countdown = this.countdowns.byId(countdownId);
    if (!countdown) throw new Error('Choose an existing countdown.');
    if (milestoneId && !countdown.milestones.some((milestone) => milestone.id === milestoneId)) throw new Error('Choose a milestone belonging to the selected countdown.');
  }

  private persist(): void {
    const snapshot = this._reminders();
    this.writeQueue = this.writeQueue.then(() => this.repository.saveAll(snapshot))
      .catch(() => this._error.set('Could not save reminders to this device.'));
  }
}