import { test, expect } from '@playwright/test';
import { PUBLIC_PAGES } from './routes';

test.describe('public pages — 100% route coverage', () => {
  for (const pageDef of PUBLIC_PAGES) {
    test(`renders ${pageDef.path}`, async ({ page }) => {
      await page.goto(pageDef.path);
      await expect(page.getByRole('heading', { name: pageDef.heading })).toBeVisible();
    });
  }

  test('landing example chip navigates to demo dashboard', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'FastAPI' }).click();
    await expect(page).toHaveURL(/\/dashboard\//, { timeout: 30_000 });
    await expect(page.getByText(/Ask a question|Total Reviews|Demo data/i).first()).toBeVisible();
  });
});
