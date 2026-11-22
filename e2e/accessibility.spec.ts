import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createCountdown, resetClient } from './fixtures';

export async function expectAccessible(page: import('@playwright/test').Page, routeName: string): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations, `${routeName} accessibility violations`).toEqual([]);
}

test.describe('WCAG automated accessibility smoke checks', () => {
  test.beforeEach(async ({ page }) => resetClient(page));

  test('dashboard, account, reminders, and create form have no axe violations', async ({ page }) => {
    for (const route of ['/dashboard', '/account', '/reminders', '/countdowns/new']) {
      await page.goto(route);
      await expect(page.locator('main#main-content')).toBeVisible();
      await expectAccessible(page, route);
    }
  });

  test('countdown detail, wallpaper, and milestone states have no axe violations', async ({ page }) => {
    await createCountdown(page, 'Accessible deadline');
    await expectAccessible(page, 'countdown detail');
    const countdownId = page.url().split('/').pop();
    await page.goto(`/theme-studio/${countdownId}`);
    await expectAccessible(page, 'wallpaper studio');
    await page.goto(`/countdowns/${countdownId}`);
    await page.getByRole('button', { name: 'Add milestone' }).click();
    await expectAccessible(page, 'milestone editor');
  });
});
