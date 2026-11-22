import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CLOUD_CONFIG } from './cloud-config';
import { AuthSessionService, AuthSession } from './auth-session.service';

interface SupabaseSessionResponse { access_token?: string; refresh_token?: string; expires_in?: number; user?: { id: string; email?: string }; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(CLOUD_CONFIG);
  private readonly sessionState = inject(AuthSessionService);
  readonly session = this.sessionState.session;
  readonly authenticated = this.sessionState.authenticated;

  constructor() { void this.restoreSession(); }

  async register(email: string, password: string): Promise<void> {
    await this.authenticate('signup', email, password);
  }

  async login(email: string, password: string): Promise<void> {
    await this.authenticate('token?grant_type=password', email, password);
  }

  async resetPassword(email: string): Promise<void> {
    this.assertConfigured();
    await firstValueFrom(this.http.post(`${this.config.supabaseUrl}/auth/v1/recover`, { email }, { headers: this.authHeaders() }));
  }

  logout(): void {
    this.sessionState.set(null);
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('t-minus.auth.refresh');
  }

  async restoreSession(): Promise<void> {
    if (!this.config.supabaseUrl || !this.config.supabaseAnonKey || typeof sessionStorage === 'undefined') return;
    const refreshToken = sessionStorage.getItem('t-minus.auth.refresh');
    if (!refreshToken) return;
    try { await this.refresh(refreshToken); }
    catch { sessionStorage.removeItem('t-minus.auth.refresh'); }
  }

  async refreshSession(): Promise<void> {
    const refreshToken = typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem('t-minus.auth.refresh');
    if (!refreshToken) { this.logout(); return; }
    await this.refresh(refreshToken);
  }

  private async authenticate(path: string, email: string, password: string): Promise<void> {
    this.assertConfigured();
    const response = await firstValueFrom(this.http.post<SupabaseSessionResponse>(
      `${this.config.supabaseUrl}/auth/v1/${path}`, { email, password }, { headers: this.authHeaders() }
    ));
    this.saveSession(response);
  }

  private async refresh(refreshToken: string): Promise<void> {
    const response = await firstValueFrom(this.http.post<SupabaseSessionResponse>(
      `${this.config.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, { refresh_token: refreshToken }, { headers: this.authHeaders() }
    ));
    this.saveSession(response);
  }

  private saveSession(response: SupabaseSessionResponse): void {
    if (!response.access_token || !response.refresh_token || !response.user?.id) {
      throw new Error('Registration was received. Confirm your email, then sign in to create a session.');
    }
    this.sessionState.set({ accessToken: response.access_token, userId: response.user.id, email: response.user.email,
      expiresAt: response.expires_in ? Date.now() + response.expires_in * 1000 : undefined });
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('t-minus.auth.refresh', response.refresh_token);
  }

  private authHeaders(): HttpHeaders { return new HttpHeaders({ apikey: this.config.supabaseAnonKey, 'Content-Type': 'application/json' }); }
  private assertConfigured(): void {
    if (!this.config.supabaseUrl || !this.config.supabaseAnonKey) throw new Error('Supabase authentication is not configured.');
  }
}