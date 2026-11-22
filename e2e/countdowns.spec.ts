import { test, expect } from '@playwright/test';
import { createCountdown, resetClient } from './fixtures';

test.describe('guest countdown workflows', () => {
  test.beforeEach(async ({ page }) => resetClient(page));

  test('creates, edits, reloads, and deletes a countdown', async ({ page }) => {
    await createCountdown(page);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Launch deadline' })).toBeVisible();

    await page.getByRole('link', { name: 'Edit' }).click();
    await page.getByLabel('Title').fill('Updated deadline');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('heading', { name: 'Updated deadline' })).toBeVisible();

    await page.goto('/countdowns');
    await expect(page.getByRole('link', { name: 'Updated deadline' })).toBeVisible();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'No countdowns yet' })).toBeVisible();
  });

  test('shows validation errors and supports pause/archive state changes', async ({ page }) => {
    await page.goto('/countdowns/new');
    await page.getByRole('button', { name: 'Create countdown' }).click();
    await expect(page.getByText('Title is required')).toBeVisible();
    await expect(page.getByText('Choose a date and time')).toBeVisible();

    await createCountdown(page, 'Stateful deadline');
    await page.goto('/countdowns');
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(page.getByText('paused', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Resume' }).click();
    await page.getByRole('button', { name: 'Archive', exact: true }).click();
    await expect(page.getByText('archived', { exact: true })).toBeVisible();
  });
});

test.describe('milestone workflows', () => {
  test.beforeEach(async ({ page }) => resetClient(page));

  test('adds, completes, reopens, and rejects duplicate milestones', async ({ page }) => {
    await createCountdown(page, 'Milestone plan');
    await page.getByRole('button', { name: 'Add milestone' }).click();
    await page.getByLabel('Title').last().fill('Book venue');
    await page.getByLabel('Date').fill('2027-01-10');
    await page.getByRole('button', { name: 'Add milestone' }).last().click();
    await expect(page.getByText('Book venue')).toBeVisible();
    const checkbox = page.getByRole('checkbox', { name: 'Mark Book venue as done' });
    await checkbox.check();
    await expect(page.getByRole('progressbar', { name: 'Overall milestone completion' })).toHaveAttribute('aria-valuenow', '10');
    await page.getByRole('checkbox', { name: 'Mark Book venue as not done' }).uncheck();
    await expect(page.getByRole('progressbar', { name: 'Overall milestone completion' })).toHaveAttribute('aria-valuenow', '0');
  });
});
