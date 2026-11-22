import { test, expect } from '@playwright/test';
import { createCountdown, resetClient } from './fixtures';

test('mocked authentication and HTTP 409 conflict recovery preserve the outbox', async ({ page }) => {
  await page.addInitScript(() => {
    window.__T_MINUS_CONFIG__ = {
      supabaseUrl: 'https://supabase.mock',
      supabaseAnonKey: 'public-test-key',
      apiUrl: 'https://api.mock',
    };
  });
  await page.route('https://supabase.mock/auth/v1/token?grant_type=password', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ access_token: 'test-access-token', refresh_token: 'test-refresh-token', expires_in: 3600, user: { id: '00000000-0000-4000-8000-000000000001', email: 'test@example.com' } }),
  }));
  let syncAttempts = 0;
  await page.route('https://api.mock/api/sync', async (route) => {
    syncAttempts += 1;
    if (syncAttempts === 1) {
      await route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ code: 'VERSION_CONFLICT' }) });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [{ id: 'local', status: 'updated', revision: 2 }] }) });
    }
  });
  await page.route('https://api.mock/api/sync/countdown/**', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ deleted: false, record: { id: 'remote', revision: 2 } }),
  }));
  await resetClient(page);
  await createCountdown(page, 'Queued guest data');
  await page.goto('/account');
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText(/Signed in as/)).toBeVisible();
  await page.getByRole('button', { name: 'Review and queue local records' }).click();
  await page.getByRole('button', { name: 'Retry recoverable sync' }).click();
  await expect(page.getByText(/conflicts remain paused/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Conflicts requiring attention' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Keep local version' })).toBeVisible();
});

test('authenticated account UI exposes accessible form names', async ({ page }) => {
  await page.goto('/account');
  await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  await page.getByLabel('Email').focus();
  await expect(page.getByLabel('Email')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Password')).toBeFocused();
});
