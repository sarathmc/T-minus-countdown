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

for (const viewport of [
  { name: 'mobile 320', width: 320, height: 800 },
  { name: 'mobile 375', width: 375, height: 800 },
  { name: 'mobile 430', width: 430, height: 800 },
  { name: 'tablet 768', width: 768, height: 900 },
  { name: 'desktop', width: 1440, height: 900 },
]) {
  test(`reminder date and timezone fields are spaced at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await resetClient(page);
    await createCountdown(page, 'Reminder layout deadline');
    await page.goto('/reminders');

    const row = page.locator('.reminder-schedule-row');
    const dateField = row.locator('.form-field').nth(0);
    const timezoneField = row.locator('.form-field').nth(1);
    const dateBox = await dateField.boundingBox();
    const timezoneBox = await timezoneField.boundingBox();
    expect(dateBox).not.toBeNull();
    expect(timezoneBox).not.toBeNull();

    if (viewport.width <= 520) {
      expect(timezoneBox!.y - (dateBox!.y + dateBox!.height)).toBeGreaterThanOrEqual(15);
      expect(Math.abs(timezoneBox!.x - dateBox!.x)).toBeLessThanOrEqual(1);
    } else {
      expect(timezoneBox!.x - (dateBox!.x + dateBox!.width)).toBeGreaterThanOrEqual(15);
      expect(dateBox!.width).toBeGreaterThan(0);
      expect(timezoneBox!.width).toBeGreaterThan(0);
    }
    await expect(dateField.locator('label')).toBeVisible();
    await expect(timezoneField.locator('label')).toBeVisible();
  });
}
