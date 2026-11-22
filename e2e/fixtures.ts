import { expect, Page } from '@playwright/test';

export async function resetClient(page: Page): Promise<void> {
  await page.goto('/dashboard');
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase('t-minus-countdown');
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  });
  await page.reload();
}

export async function createCountdown(page: Page, title = 'Launch deadline'): Promise<void> {
  await page.goto('/countdowns/new');
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Target date and time').fill('2030-01-15T12:00');
  await page.getByRole('button', { name: 'Create countdown' }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
}
