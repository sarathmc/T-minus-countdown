import { InjectionToken } from '@angular/core';

export interface CloudConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  apiUrl: string;
  vapidPublicKey?: string;
}

declare global {
  interface Window { __T_MINUS_CONFIG__?: CloudConfig; }
}

export const CLOUD_CONFIG = new InjectionToken<CloudConfig>('CLOUD_CONFIG', {
  providedIn: 'root',
  factory: () => typeof window === 'undefined'
    ? ({ supabaseUrl: '', supabaseAnonKey: '', apiUrl: '' })
    : (window.__T_MINUS_CONFIG__ ?? { supabaseUrl: '', supabaseAnonKey: '', apiUrl: '' }),
});