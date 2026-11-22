import { InjectionToken } from '@angular/core';
import { Countdown } from '../../domain/models/countdown.model';
import { CountdownTheme, DEFAULT_COUNTDOWN_THEME, isCountdownTheme } from '../../domain/models/countdown-theme.model';

export interface CountdownRepository {
  load(): Promise<Countdown[]>;
  saveAll(countdowns: readonly Countdown[]): Promise<void>;
}

export class IndexedDbCountdownRepository implements CountdownRepository {
  constructor(private readonly databaseName = 't-minus-countdown') {}
  private readonly storeName = 'countdowns';

  async load(): Promise<Countdown[]> {
    const database = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(this.storeName, 'readonly');
      const request = transaction.objectStore(this.storeName).getAll();
      let records: Countdown[] = [];
      request.onsuccess = () => { records = request.result as Countdown[]; };
      request.onerror = () => { database.close(); reject(request.error); };
      transaction.oncomplete = () => { database.close(); resolve(records); };
      transaction.onerror = () => { database.close(); reject(transaction.error); };
      transaction.onabort = () => { database.close(); reject(transaction.error); };
    });
  }

  async saveAll(countdowns: readonly Countdown[]): Promise<void> {
    const database = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      store.clear();
      countdowns.forEach((countdown) => store.put(countdown));
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
        if (!request.result.objectStoreNames.contains(this.storeName)) request.result.createObjectStore(this.storeName, { keyPath: 'id' });
        if (!request.result.objectStoreNames.contains('reminders')) request.result.createObjectStore('reminders', { keyPath: 'id' });
        if (!request.result.objectStoreNames.contains('reminder-preferences')) request.result.createObjectStore('reminder-preferences', { keyPath: 'id' });
        if (!request.result.objectStoreNames.contains('sync-queue')) request.result.createObjectStore('sync-queue', { keyPath: 'id' });
        if (!request.result.objectStoreNames.contains('sync-conflicts')) request.result.createObjectStore('sync-conflicts', { keyPath: 'id' });
        if (!request.result.objectStoreNames.contains('sync-state')) request.result.createObjectStore('sync-state', { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

export const COUNTDOWN_REPOSITORY = new InjectionToken<CountdownRepository>('COUNTDOWN_REPOSITORY', {
  providedIn: 'root',
  factory: () => new IndexedDbCountdownRepository(),
});

export function isCountdownRecord(value: unknown): value is Countdown {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<Countdown>;
  const categories = ['personal', 'work', 'study', 'travel', 'health', 'finance', 'other'];
  const validMilestones = Array.isArray(record.milestones) && record.milestones.every((milestone) =>
    !!milestone && typeof milestone.id === 'string' && milestone.countdownId === record.id &&
    typeof milestone.title === 'string' && milestone.title.length > 0 &&
    typeof milestone.date === 'string' && Number.isFinite(Date.parse(milestone.date)) &&
    Number.isInteger(milestone.offsetDays) && milestone.offsetDays >= 0 &&
    typeof milestone.done === 'boolean' && typeof milestone.isDefault === 'boolean'
  );
  return typeof record.id === 'string' && typeof record.title === 'string' && record.title.length > 0 &&
    typeof record.targetDate === 'string' && Number.isFinite(Date.parse(record.targetDate)) &&
    typeof record.timeZone === 'string' && Number.isFinite(Date.parse(record.createdAt ?? '')) &&
    Number.isFinite(Date.parse(record.updatedAt ?? '')) && categories.includes(record.category ?? '') &&
    ['active', 'paused', 'archived'].includes(record.status ?? '') && validMilestones &&
    (record.theme === undefined || isCountdownTheme(record.theme));
}

export function normalizeCountdownTheme(theme: CountdownTheme | undefined): CountdownTheme {
  return isCountdownTheme(theme) ? { ...theme } : { ...DEFAULT_COUNTDOWN_THEME };
}

export function normalizeCountdown(countdown: Countdown): Countdown {
  return { ...countdown, theme: normalizeCountdownTheme(countdown.theme) };
}