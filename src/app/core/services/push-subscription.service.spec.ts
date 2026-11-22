import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { CLOUD_CONFIG } from './cloud-config';
import { PushSubscriptionService } from './push-subscription.service';

describe('PushSubscriptionService', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      { provide: CLOUD_CONFIG, useValue: { supabaseUrl: '', supabaseAnonKey: '', apiUrl: '' } },
    ],
  }));

  it('reports unsupported browsers without attempting registration', async () => {
    const service = TestBed.inject(PushSubscriptionService);
    service.supported.set(false);
    await expectAsync(service.enable()).toBeRejectedWithError('Push notifications are not supported by this browser.');
  });

  it('fails closed when server push configuration is absent', async () => {
    const service = TestBed.inject(PushSubscriptionService);
    service.supported.set(true);
    await expectAsync(service.enable()).toBeRejectedWithError('Server push notifications are not configured.');
  });
});
