import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { CLOUD_CONFIG } from './cloud-config';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.removeItem('t-minus.auth.refresh');
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(),
        { provide: CLOUD_CONFIG, useValue: { supabaseUrl: 'https://auth.example', supabaseAnonKey: 'public-key', apiUrl: '' } }],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { http.verify(); sessionStorage.removeItem('t-minus.auth.refresh'); });

  it('sets authenticated state after login and clears it on logout', async () => {
    const login = service.login('person@example.test', 'not-stored');
    http.expectOne('https://auth.example/auth/v1/token?grant_type=password').flush({
      access_token: 'access', refresh_token: 'refresh', expires_in: 3600, user: { id: 'user-id', email: 'person@example.test' },
    });
    await login;
    expect(service.authenticated()).toBeTrue();
    expect(service.session()?.userId).toBe('user-id');
    service.logout();
    expect(service.authenticated()).toBeFalse();
  });

  it('does not store a password or session in localStorage', async () => {
    const setItem = spyOn(localStorage, 'setItem');
    const signup = service.register('person@example.test', 'sensitive-password');
    http.expectOne('https://auth.example/auth/v1/signup').flush({
      access_token: 'access', refresh_token: 'refresh', user: { id: 'user-id' },
    });
    await signup;
    expect(setItem).not.toHaveBeenCalled();
  });
});