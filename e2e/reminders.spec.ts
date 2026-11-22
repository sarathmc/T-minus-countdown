import { test, expect } from '@playwright/test';
import { createCountdown, resetClient } from './fixtures';

test('creates, persists, updates, and deletes a reminder', async ({ page }) => {
  await resetClient(page);
  await createCountdown(page, 'Reminder deadline');
  await page.goto('/reminders');
  await page.getByLabel('Countdown').selectOption({ label: 'Reminder deadline' });
  await page.getByLabel('Reminder title').fill('Review plan');
  await page.getByLabel('Date and time').fill('2030-01-10T09:00');
  await page.getByRole('button', { name: 'Save reminder' }).click();
  await expect(page.getByRole('heading', { name: 'Review plan' })).toBeVisible();
  await expect(page.getByText('Reminder saved on this device.')).toBeVisible();
  await page.getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Reminder title').fill('Review updated plan');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('heading', { name: 'Review updated plan' })).toBeVisible();
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('No scheduled reminders.')).toBeVisible();
});

test('reports unsupported browser notification environments', async ({ browser }) => {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    Object.defineProperty(window, 'Notification', { configurable: true, value: undefined });
  });
  const page = await context.newPage();
  await page.goto('/reminders');
  await expect(page.getByText('This browser does not support the Notification API.')).toBeVisible();
  await context.close();
});
