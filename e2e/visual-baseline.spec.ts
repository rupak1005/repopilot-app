import { test, expect, type Page } from '@playwright/test';
import { deriveRepositoryId } from '@repopilot/common';
import { DEMO_CHIP_LABEL, DEMO_REPO_SLUG } from './routes';

const DEMO_REPO_ID = deriveRepositoryId(DEMO_REPO_SLUG);

async function openDemo(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: DEMO_CHIP_LABEL }).click();
  await page.waitForURL(`**/dashboard/${DEMO_REPO_ID}**`, { timeout: 30_000 });
}

/**
 * Structural smoke for flagship surfaces.
 *
 * Pixel snapshots were removed from the required e2e job: Ubuntu Chromium
 * vs local Fontshare metrics caused recurring ±1px / layout-height failures
 * even with locked boxes (Playwright ignores `clip` on locator screenshots).
 * Re-introduce Percy/Chromatic when ready — see docs/VISUAL_REGRESSION_BASELINE.md.
 */
test.describe('visual baseline', () => {
  test('landing hero', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: DEMO_CHIP_LABEL })).toBeVisible();
  });

  test('architecture shell', async ({ page }) => {
    await openDemo(page);
    await page.goto(`/dashboard/${DEMO_REPO_ID}/architecture`);
    await expect(page.getByRole('heading', { name: /codebase fits together/i })).toBeVisible();
    await expect(page.locator('.ui-diagram-page')).toBeVisible();
  });

  test('impact empty state', async ({ page }) => {
    await openDemo(page);
    await page.goto(`/dashboard/${DEMO_REPO_ID}/impact`);
    await expect(page.getByRole('heading', { name: /^Impact$/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/What breaks if this module or PR changes/i)).toBeVisible();
    await expect(page.locator('.ui-impact-page')).toBeVisible();
  });
});
