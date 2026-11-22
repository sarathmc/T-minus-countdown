import { test, expect } from '@playwright/test';
import { resetClient } from './fixtures';

for (const viewport of [
  { name: 'mobile portrait', width: 375, height: 812 },
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
