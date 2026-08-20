import { test, expect } from '@playwright/test';
import { deriveRepositoryId } from '@repopilot/common';
import { DEMO_CHIP_LABEL, DEMO_REPO_SLUG } from './routes';

const DEMO_REPO_ID = deriveRepositoryId(DEMO_REPO_SLUG);

const shot = {
  animations: 'disabled' as const,
  caret: 'hide' as const,
  maxDiffPixelRatio: 0.03
};

test.describe('visual baseline', () => {
  test('landing hero', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(page).toHaveScreenshot('landing.png', { ...shot, fullPage: false });
  });

  test('architecture shell', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: DEMO_CHIP_LABEL }).click();
    await page.waitForURL(`**/dashboard/${DEMO_REPO_ID}**`, { timeout: 30_000 });
    await page.goto(`/dashboard/${DEMO_REPO_ID}/architecture`);
    await expect(page.getByRole('heading', { name: /codebase fits together/i })).toBeVisible();
    await expect(page.locator('.ui-diagram-page')).toHaveScreenshot('architecture.png', shot);
  });

  test('impact empty state', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: DEMO_CHIP_LABEL }).click();
    await page.waitForURL(`**/dashboard/${DEMO_REPO_ID}**`, { timeout: 30_000 });
    await page.goto(`/dashboard/${DEMO_REPO_ID}/impact`);
    await expect(page.getByText(/Impact/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.canvas-inner').first()).toHaveScreenshot('impact.png', shot);
  });
});
