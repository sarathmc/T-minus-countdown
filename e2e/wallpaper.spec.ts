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
  const themedLink = themedCard.getByRole('link', { name: 'Themed deadline', exact: true });
  await themedLink.hover();
  await expect(themedLink).toHaveCSS('color', 'rgb(167, 39, 30)');
  await themedLink.focus();
  await expect(themedLink).toHaveCSS('outline-style', 'solid');
  const otherCard = page.locator('.countdown-themed').filter({ has: page.getByRole('link', { name: 'Unthemed deadline', exact: true }) });
  await expect(otherCard).toHaveCSS('background-color', 'rgb(255, 253, 248)');
  await page.goto(`/countdowns/${firstId}`);
  await expect(page.locator('.timer-panel')).toHaveCSS('color', 'rgb(23, 23, 23)');
  await page.goto(`/countdowns/${secondId}`);
  await expect(page.locator('.timer-panel')).not.toHaveCSS('color', 'rgb(23, 23, 23)');
});

test('renders readable themed detail headers on desktop and mobile', async ({ page }) => {
  const themes = [
    ['Gradient Focus', 'rgb(41, 61, 117)', 'rgb(255, 255, 255)'],
    ['Minimal Light', 'rgb(244, 240, 232)', 'rgb(36, 35, 31)'],
    ['Midnight Dark', 'rgb(21, 25, 35)', 'rgb(244, 242, 236)'],
    ['Bold Typography', 'rgb(245, 203, 75)', 'rgb(23, 23, 23)'],
    ['Milestone Planner', 'rgb(231, 238, 232)', 'rgb(32, 59, 50)'],
  ] as const;
  await resetClient(page);
  await createCountdown(page, 'Contrast deadline');
  const countdownId = page.url().split('/').pop();

  for (const [viewport, width] of [['desktop', 1440], ['mobile', 375]] as const) {
    await page.setViewportSize({ width, height: viewport === 'desktop' ? 900 : 812 });
    for (const [name, background, text] of themes) {
      await page.goto(`/theme-studio/${countdownId}`);
      await page.getByRole('button', { name: new RegExp(name) }).click();
      await page.getByRole('button', { name: 'Apply theme' }).click();
      await page.waitForTimeout(300);
      await page.goto(`/countdowns/${countdownId}`);
      const header = page.locator('.countdown-header');
      await expect(header).toHaveCSS('background-color', background);
      await expect(header.locator('h1')).toHaveCSS('color', text);
      await expect(header.getByRole('link', { name: 'All countdowns' })).toBeVisible();
      await expect(header.locator('.muted').last()).toBeVisible();
    }
  }
});
