import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { COUNTDOWN_REPOSITORY } from './countdown-repository';
import { REMINDER_REPOSITORY } from './reminder-repository';
import { NotificationPermissionService, notificationPermissionState } from './notification-permission.service';

describe('BrowserNotificationService', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [
    provideRouter([]),
    { provide: COUNTDOWN_REPOSITORY, useValue: { load: async () => [], saveAll: async () => undefined } },
    { provide: REMINDER_REPOSITORY, useValue: { load: async () => [], saveAll: async () => undefined, loadPreferences: async () => ({}), savePreferences: async () => undefined } },
  ] }));

  it('represents unsupported, default, granted and denied browser permission states', () => {
    expect(notificationPermissionState(undefined)).toBe('unsupported');
    expect(notificationPermissionState({ permission: 'default' })).toBe('default');
    expect(notificationPermissionState({ permission: 'granted' })).toBe('granted');
    expect(notificationPermissionState({ permission: 'denied' })).toBe('denied');
  });

  it('does not request permission until the explicit request method is called', async () => {
    const request = spyOn(Notification, 'requestPermission').and.returnValue(Promise.resolve('denied'));
    const service = TestBed.inject(NotificationPermissionService);
    expect(request).not.toHaveBeenCalled();
    expect(await service.requestPermission()).toBe('denied');
    expect(request).toHaveBeenCalledTimes(1);
    expect(service.permission()).toBe('denied');
  });
});