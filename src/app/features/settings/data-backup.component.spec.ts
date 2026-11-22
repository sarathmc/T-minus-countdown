import { TestBed } from '@angular/core/testing';
import { CountdownFactoryService } from '../../core/services/countdown-factory.service';
import { CountdownStoreService } from '../../core/services/countdown-store.service';
import { DataBackupComponent } from './data-backup.component';

describe('DataBackupComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [DataBackupComponent] });
  });

  it('restores a countdown theme from a JSON backup', async () => {
    const store = TestBed.inject(CountdownStoreService);
    const countdown = TestBed.inject(CountdownFactoryService).create({
      title: 'Restored theme',
      targetDate: new Date(Date.now() + 86400000).toISOString(),
      timeZone: 'UTC',
      category: 'work',
    });
    countdown.theme = {
      ...countdown.theme!,
      id: 'gradient',
      name: 'Gradient Focus',
    };
    store.remove(countdown.id);

    const fixture = TestBed.createComponent(DataBackupComponent);
    const component = fixture.componentInstance as unknown as {
      importData: (event: Event) => Promise<void>;
    };
    spyOn(window, 'confirm').and.returnValue(true);
    const file = new File(
      [JSON.stringify({ version: 1, countdowns: [countdown] })],
      'backup.json',
      { type: 'application/json' }
    );
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [file] });

    await component.importData({ target: input } as unknown as Event);

    expect(store.byId(countdown.id)?.theme?.id).toBe('gradient');
  });
});
