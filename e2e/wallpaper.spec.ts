import { test, expect } from '@playwright/test';
import { createCountdown, resetClient } from './fixtures';
import fs from 'node:fs/promises';

test('wallpaper studio changes design and exports a non-empty PNG', async ({ page }) => {
  await resetClient(page);
  await createCountdown(page, 'Wallpaper deadline');
  const countdownId = page.url().split('/').pop();
  await page.goto(`/wallpaper-studio/${countdownId}`);
  await expect(page.getByRole('heading', { name: 'Wallpaper studio' })).toBeVisible();
  await page.getByRole('button', { name: /Gradient/i }).click();
  await page.getByRole('button', { name: 'Desktop · 16:9' }).click();
  await expect(page.getByText('1920 × 1080 px')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG' }).click();
  const file = await download;
  const path = await file.path();
  expect(path).not.toBeNull();
  const bytes = await fs.readFile(path!);
  expect(bytes.length).toBeGreaterThan(1000);
  expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(bytes.readUInt32BE(16)).toBe(1920);
  expect(bytes.readUInt32BE(20)).toBe(1080);
});
