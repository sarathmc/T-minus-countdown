import { Injectable, computed, signal } from '@angular/core';

export interface AuthSession { accessToken: string; userId: string; email?: string; expiresAt?: number; }

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly sessionState = signal<AuthSession | null>(null);
  readonly session = this.sessionState.asReadonly();
  readonly authenticated = computed(() => this.sessionState() !== null);
  set(session: AuthSession | null): void { this.sessionState.set(session); }
}