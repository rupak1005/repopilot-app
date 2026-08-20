import { test, expect, type Page } from '@playwright/test';
import { deriveRepositoryId } from '@repopilot/common';
import { DEMO_CHIP_LABEL, DEMO_REPO_SLUG } from './routes';

const DEMO_REPO_ID = deriveRepositoryId(DEMO_REPO_SLUG);

const shot = {
  animations: 'disabled' as const,
  caret: 'hide' as const,
  maxDiffPixelRatio: 0.03
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

    const target = page.locator('.ui-diagram-page');
    // Lock height: Fontshare metrics on CI Linux shift full-element height (~26px)
    // and Playwright rejects size-mismatched snapshots even when maxDiffPixelRatio is set.
    await target.evaluate((el) => {
      el.style.boxSizing = 'border-box';
      el.style.height = '1400px';
      el.style.maxHeight = '1400px';
      el.style.overflow = 'hidden';
    });
    await expect(target).toHaveScreenshot('architecture.png', shot);
  });

  test('impact empty state', async ({ page }) => {
    await openDemo(page);
    await page.goto(`/dashboard/${DEMO_REPO_ID}/impact`);
    await expect(page.getByRole('heading', { name: /^Impact$/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/What breaks if this module or PR changes/i)).toBeVisible();
    await settleFonts(page);

    const target = page.locator('.ui-impact-page');
    // Lock height: Fontshare metrics on CI Linux were changing full-element height (~23px)
    // and Playwright rejects size-mismatched snapshots even when maxDiffPixelRatio is set.
    await target.evaluate((el) => {
      el.style.boxSizing = 'border-box';
      el.style.height = '900px';
      el.style.maxHeight = '900px';
      el.style.overflow = 'hidden';
    });
    await expect(target).toHaveScreenshot('impact.png', shot);
  });
});
