import { InjectionToken } from '@angular/core';
import { DEFAULT_REMINDER_PREFERENCES, Reminder, ReminderPreferences, isReminderRecord } from '../../domain/models/reminder.model';

export interface ReminderRepository {
  load(): Promise<Reminder[]>;
  saveAll(reminders: readonly Reminder[]): Promise<void>;
  loadPreferences(): Promise<ReminderPreferences>;
  savePreferences(preferences: ReminderPreferences): Promise<void>;
}

export class IndexedDbReminderRepository implements ReminderRepository {
  constructor(private readonly databaseName = 't-minus-countdown') {}
  private readonly remindersStore = 'reminders';
  private readonly preferencesStore = 'reminder-preferences';

  async load(): Promise<Reminder[]> {
    const database = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(this.remindersStore, 'readonly');
      const request = transaction.objectStore(this.remindersStore).getAll();
      let records: Reminder[] = [];
      request.onsuccess = () => { records = (request.result as unknown[]).filter(isReminderRecord); };
      request.onerror = () => { database.close(); reject(request.error); };
      transaction.oncomplete = () => { database.close(); resolve(records); };
      transaction.onerror = () => { database.close(); reject(transaction.error); };
      transaction.onabort = () => { database.close(); reject(transaction.error); };
    });
  }

  async saveAll(reminders: readonly Reminder[]): Promise<void> {
    const database = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(this.remindersStore, 'readwrite');
      const store = transaction.objectStore(this.remindersStore);
      store.clear();
      reminders.forEach((reminder) => store.put(reminder));
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => { database.close(); reject(transaction.error); };
      transaction.onabort = () => { database.close(); reject(transaction.error); };
    });
  }

  async loadPreferences(): Promise<ReminderPreferences> {
    const database = await this.open();
    return new Promise((resolve, reject) => {
      const request = database.transaction(this.preferencesStore, 'readonly').objectStore(this.preferencesStore).get('current');
      request.onsuccess = () => {
        const stored = request.result as (ReminderPreferences & { id?: string }) | undefined;
        const preferences = stored ? { notificationsEnabled: stored.notificationsEnabled, dailyReminderEnabled: stored.dailyReminderEnabled,
          dailyReminderTime: stored.dailyReminderTime, timeZone: stored.timeZone } : undefined;
        database.close();
        resolve(validPreferences(preferences) ? preferences : { ...DEFAULT_REMINDER_PREFERENCES });
      };
      request.onerror = () => { database.close(); reject(request.error); };
    });
  }

  async savePreferences(preferences: ReminderPreferences): Promise<void> {
    const database = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(this.preferencesStore, 'readwrite');
      transaction.objectStore(this.preferencesStore).put({ ...preferences, id: 'current' });
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => { database.close(); reject(transaction.error); };
      transaction.onabort = () => { database.close(); reject(transaction.error); };
    });
  }

  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB is unavailable.'));
      const request = indexedDB.open(this.databaseName, 3);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains('countdowns')) database.createObjectStore('countdowns', { keyPath: 'id' });
        if (!database.objectStoreNames.contains(this.remindersStore)) database.createObjectStore(this.remindersStore, { keyPath: 'id' });
        if (!database.objectStoreNames.contains(this.preferencesStore)) database.createObjectStore(this.preferencesStore, { keyPath: 'id' });
        if (!database.objectStoreNames.contains('sync-queue')) database.createObjectStore('sync-queue', { keyPath: 'id' });
        if (!database.objectStoreNames.contains('sync-conflicts')) database.createObjectStore('sync-conflicts', { keyPath: 'id' });
        if (!database.objectStoreNames.contains('sync-state')) database.createObjectStore('sync-state', { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

export function validPreferences(value: unknown): value is ReminderPreferences {
  if (!value || typeof value !== 'object') return false;
  const preferences = value as Partial<ReminderPreferences>;
  return typeof preferences.notificationsEnabled === 'boolean' && typeof preferences.dailyReminderEnabled === 'boolean' &&
    typeof preferences.dailyReminderTime === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(preferences.dailyReminderTime) &&
    typeof preferences.timeZone === 'string' && isValidTimeZone(preferences.timeZone);
}

function isValidTimeZone(timeZone: string): boolean {
  try { new Intl.DateTimeFormat('en', { timeZone }); return true; } catch { return false; }
}

export const REMINDER_REPOSITORY = new InjectionToken<ReminderRepository>('REMINDER_REPOSITORY', {
  providedIn: 'root',
  factory: () => new IndexedDbReminderRepository(),
});