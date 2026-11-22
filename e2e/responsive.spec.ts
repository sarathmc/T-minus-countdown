import { test, expect } from '@playwright/test';
import { resetClient } from './fixtures';

for (const viewport of [
  { name: 'small mobile', width: 320, height: 720 },
  { name: 'mobile portrait', width: 375, height: 812 },
  { name: 'large mobile', width: 430, height: 900 },
  { name: 'tablet portrait', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
]) {
  test(`dashboard has no horizontal overflow at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await resetClient(page);
    await expect(page.locator('body')).toHaveCSS('overflow-x', 'visible');
    const overflow = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('*'))
      .map((element) => ({ tag: element.tagName, className: element.className, right: element.getBoundingClientRect().right }))
      .filter((item) => item.right > window.innerWidth + 1)
      .sort((a, b) => b.right - a.right)
      .slice(0, 5));
    expect(overflow, `horizontal overflow at ${viewport.name}`).toEqual([]);
  });
}

test('mobile navigation is compact, accessible, and closes after navigation', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await resetClient(page);

  const menu = page.getByRole('button', { name: 'Toggle primary navigation' });
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');

  await menu.click();
  await page.getByRole('link', { name: 'Account' }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
});

for (const width of [320, 375, 430]) {
  test(`account page has no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await resetClient(page);
    await page.goto('/account');
    const overflow = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('*'))
      .map((element) => element.getBoundingClientRect().right)
      .filter((right) => right > window.innerWidth + 1));
    expect(overflow, `account horizontal overflow at ${width}px`).toEqual([]);
  });
}
