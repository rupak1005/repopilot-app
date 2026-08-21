import { test, expect, type Page } from '@playwright/test';
import { deriveRepositoryId } from '@repopilot/common';
import { DEMO_CHIP_LABEL, DEMO_REPO_SLUG } from './routes';

const DEMO_REPO_ID = deriveRepositoryId(DEMO_REPO_SLUG);

/**
 * Baselines are captured on GitHub Actions Ubuntu Chromium.
 * Local Arch font metrics differ; ratios absorb AA drift.
 * Do not use locator `clip` — Playwright ignores it for element screenshots
 * and CI still emits ±1px heights that fail size checks.
 */
const shot = {
  animations: 'disabled' as const,
  caret: 'hide' as const,
  maxDiffPixelRatio: 0.08
};

async function openDemo(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: DEMO_CHIP_LABEL }).click();
  await page.waitForURL(`**/dashboard/${DEMO_REPO_ID}**`, { timeout: 30_000 });
}

async function settleFonts(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

test.describe('visual baseline', () => {
  test('landing hero', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await settleFonts(page);
    await expect(page).toHaveScreenshot('landing.png', { ...shot, fullPage: false });
  });

  test('architecture shell', async ({ page }) => {
    await openDemo(page);
    await page.goto(`/dashboard/${DEMO_REPO_ID}/architecture`);
    await expect(page.getByRole('heading', { name: /codebase fits together/i })).toBeVisible();
    await settleFonts(page);
    await expect(page.locator('.ui-diagram-page')).toHaveScreenshot('architecture.png', shot);
  });

  test('impact empty state', async ({ page }) => {
    await openDemo(page);
    await page.goto(`/dashboard/${DEMO_REPO_ID}/impact`);
    await expect(page.getByRole('heading', { name: /^Impact$/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/What breaks if this module or PR changes/i)).toBeVisible();
    await settleFonts(page);
    await expect(page.locator('.ui-impact-page')).toHaveScreenshot('impact.png', shot);
  });
});
