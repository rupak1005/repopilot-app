import { test, expect } from '@playwright/test';
import { PUBLIC_PAGES } from './routes';

/** Cross-browser smoke — keep lean; chromium owns full suite + visuals. */
test.describe('browser smoke', () => {
  for (const pageDef of PUBLIC_PAGES.slice(0, 2)) {
    test(`renders ${pageDef.path}`, async ({ page }) => {
      await page.goto(pageDef.path);
      await expect(page.getByRole('heading', { name: pageDef.heading })).toBeVisible();
    });
  }
});
