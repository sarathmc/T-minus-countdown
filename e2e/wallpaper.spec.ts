import { test, expect } from '@playwright/test';
import { createCountdown, resetClient } from './fixtures';
import fs from 'node:fs/promises';

test('theme studio applies a design and exports a non-empty PNG', async ({ page }) => {
  await resetClient(page);
  await createCountdown(page, 'Wallpaper deadline');
  const countdownId = page.url().split('/').pop();
  await page.goto(`/theme-studio/${countdownId}`);
  await expect(page.getByRole('heading', { name: 'Theme Studio' })).toBeVisible();
  await page.getByRole('button', { name: /Gradient/i }).click();
  await page.getByRole('button', { name: 'Desktop · 16:9' }).click();
  await expect(page.getByText('1920 × 1080 px')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export as Wallpaper' }).click();
  const file = await download;
  const path = await file.path();
  expect(path).not.toBeNull();
  const bytes = await fs.readFile(path!);
  expect(bytes.length).toBeGreaterThan(1000);
  expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(bytes.readUInt32BE(16)).toBe(1920);
  expect(bytes.readUInt32BE(20)).toBe(1080);
});

test('theme studio uses the first countdown on direct entry and switches countdowns', async ({ page }) => {
  await resetClient(page);
  await createCountdown(page, 'First wallpaper');
  await page.goto('/countdowns/new');
  await page.getByLabel('Title').fill('Second wallpaper');
  await page.getByLabel('Target date and time').fill('2030-02-15T12:00');
  await page.getByRole('button', { name: 'Create countdown' }).click();

  await page.goto('/theme-studio');
  await expect(page.getByLabel('Countdown', { exact: true })).toHaveValue(/.+/);
  await page.getByLabel('Countdown', { exact: true }).selectOption({ label: 'First wallpaper' });
  await expect(page.getByRole('heading', { name: 'First wallpaper' })).toBeVisible();
  await page.getByLabel('Countdown', { exact: true }).selectOption({ label: 'Second wallpaper' });
  await expect(page.getByRole('heading', { name: 'Second wallpaper' })).toBeVisible();
});

test('legacy wallpaper studio links redirect to theme studio', async ({ page }) => {
  await resetClient(page);
  await createCountdown(page, 'Legacy route');
  const countdownId = page.url().split('/').pop();
  await page.goto(`/wallpaper-studio/${countdownId}`);
  await expect(page).toHaveURL(new RegExp(`/theme-studio/${countdownId}$`));
  await expect(page.getByRole('heading', { name: 'Theme Studio' })).toBeVisible();
});

test('applies an independent theme and persists it on the countdown presentation', async ({ page }) => {
  await resetClient(page);
  await createCountdown(page, 'Themed deadline');
  const firstId = page.url().split('/').pop();
  await page.goto('/countdowns/new');
  await page.getByLabel('Title').fill('Unthemed deadline');
  await page.getByLabel('Target date and time').fill('2030-03-15T12:00');
  await page.getByRole('button', { name: 'Create countdown' }).click();
  await expect(page.getByRole('heading', { name: 'Unthemed deadline' })).toBeVisible();
  const secondId = page.url().split('/').pop();

  await page.goto(`/theme-studio/${firstId}`);
  await page.getByRole('button', { name: /Bold Typography/ }).click();
  await page.getByRole('button', { name: 'Apply theme' }).click();
  await expect(page.getByText('Theme applied to this countdown.')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: /Bold Typography/ })).toHaveAttribute('aria-pressed', 'true');

  await page.goto('/dashboard');
  const themedCard = page.locator('.countdown-themed').filter({ has: page.getByRole('link', { name: 'Themed deadline', exact: true }) });
  await expect(themedCard).toHaveCSS('background-color', 'rgb(255, 218, 98)');
  const otherCard = page.locator('.countdown-themed').filter({ has: page.getByRole('link', { name: 'Unthemed deadline', exact: true }) });
  await expect(otherCard).toHaveCSS('background-color', 'rgb(255, 253, 248)');
  await page.goto(`/countdowns/${firstId}`);
  await expect(page.locator('.timer-panel')).toHaveCSS('color', 'rgb(23, 23, 23)');
  await page.goto(`/countdowns/${secondId}`);
  await expect(page.locator('.timer-panel')).not.toHaveCSS('color', 'rgb(23, 23, 23)');
});
