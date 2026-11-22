import { test } from '@playwright/test';

test('records browser performance baseline for the dashboard', async ({ page }) => {
  await page.addInitScript(() => {
    const metrics: Record<string, number> = {};
    (window as Window & { __tmMetrics?: Record<string, number> }).__tmMetrics = metrics;
    new PerformanceObserver((list) => {
      const entry = list.getEntries().at(-1) as PerformanceEntry & { startTime: number };
      metrics.lcp = entry.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => {
      metrics.cls = (metrics.cls ?? 0) + list.getEntries().reduce((total, entry) => total + (entry as PerformanceEntry & { value?: number }).value!, 0);
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return {
      domContentLoaded: navigation.domContentLoadedEventEnd,
      load: navigation.loadEventEnd,
      lcp: (window as Window & { __tmMetrics?: Record<string, number> }).__tmMetrics?.lcp ?? null,
      cls: (window as Window & { __tmMetrics?: Record<string, number> }).__tmMetrics?.cls ?? 0,
    };
  });
  console.log(`PERF_BASELINE ${JSON.stringify(metrics)}`);
});
