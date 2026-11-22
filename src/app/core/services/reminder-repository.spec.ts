import { DEFAULT_REMINDER_PREFERENCES, Reminder } from '../../domain/models/reminder.model';
import { Countdown } from '../../domain/models/countdown.model';
import { IndexedDbCountdownRepository } from './countdown-repository';
import { IndexedDbReminderRepository } from './reminder-repository';

describe('IndexedDbReminderRepository', () => {
  const databaseName = `t-minus-reminder-test-${crypto.randomUUID()}`;
  const repository = new IndexedDbReminderRepository(databaseName);
  const legacyCountdown: Countdown = {
    id: 'legacy-countdown', title: 'Existing deadline', targetDate: '2027-01-15T12:00:00.000Z', timeZone: 'UTC',
    category: 'work', status: 'active', milestones: [], createdAt: '2026-11-19T00:00:00.000Z', updatedAt: '2026-11-19T00:00:00.000Z',
  };
  const reminder: Reminder = {
    id: 'reminder-1', countdownId: 'countdown-1', title: 'Review', scheduledAt: '2027-01-15T12:00:00.000Z',
    timeZone: 'UTC', type: 'custom', enabled: true, deliveryStatus: 'scheduled',
    createdAt: '2026-11-19T00:00:00.000Z', updatedAt: '2026-11-19T00:00:00.000Z',
  };

  afterAll((done) => {
    const request = indexedDB.deleteDatabase(databaseName);
    request.onsuccess = () => done();
    request.onerror = () => done.fail(request.error ?? 'Could not delete the test database.');
    request.onblocked = () => done.fail('Test database is still open.');
  });

  it('creates reminder stores during the schema upgrade without losing countdown records', async () => {
    const upgradeDatabaseName = `t-minus-reminder-upgrade-${crypto.randomUUID()}`;
    const upgradeRepository = new IndexedDbReminderRepository(upgradeDatabaseName);
    const upgradeCountdownRepository = new IndexedDbCountdownRepository(upgradeDatabaseName);
    const request = indexedDB.open(upgradeDatabaseName, 1);
    const legacyDatabase = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onupgradeneeded = () => request.result.createObjectStore('countdowns', { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = legacyDatabase.transaction('countdowns', 'readwrite');
      transaction.objectStore('countdowns').put(legacyCountdown);
      transaction.oncomplete = () => { legacyDatabase.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
    });
    await upgradeRepository.load();
    expect(await upgradeCountdownRepository.load()).toEqual([legacyCountdown]);
    await new Promise<void>((resolve, reject) => {
      const deletion = indexedDB.deleteDatabase(upgradeDatabaseName);
      deletion.onsuccess = () => resolve();
      deletion.onerror = () => reject(deletion.error);
      deletion.onblocked = () => reject(new Error('Upgrade test database is still open.'));
    });
  });

  it('persists reminders and preferences in separate IndexedDB stores', async () => {
    await repository.saveAll([reminder]);
    const preferences = { ...DEFAULT_REMINDER_PREFERENCES, notificationsEnabled: true, dailyReminderTime: '08:15' };
    await repository.savePreferences(preferences);
    expect(await repository.load()).toEqual([reminder]);
    expect(await repository.loadPreferences()).toEqual(preferences);
  });

  it('rejects malformed notification preferences by using safe defaults', async () => {
    await repository.savePreferences({ ...DEFAULT_REMINDER_PREFERENCES, dailyReminderTime: '25:88' });
    expect(await repository.loadPreferences()).toEqual(DEFAULT_REMINDER_PREFERENCES);
  });
});