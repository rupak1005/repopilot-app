import { test, expect, type Locator, type Page } from '@playwright/test';
import { deriveRepositoryId } from '@repopilot/common';
import { DEMO_CHIP_LABEL, DEMO_REPO_SLUG } from './routes';

const DEMO_REPO_ID = deriveRepositoryId(DEMO_REPO_SLUG);

/** Font AA differs Arch↔Ubuntu; keep ratio loose enough for CI Linux Chromium. */
const shot = {
  animations: 'disabled' as const,
  caret: 'hide' as const,
  maxDiffPixelRatio: 0.06
};

/** Element shots still drift more after clip (graph chrome / empty panels). */
const lockedShot = {
  ...shot,
  maxDiffPixelRatio: 0.1
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

/**
 * Lock layout height and clip the screenshot to integer px.
 * Playwright rejects size-mismatched baselines even when maxDiffPixelRatio is set;
 * CI Linux Fontshare metrics often yield ±1px vs local snapshots.
 */
async function expectLockedScreenshot(
  target: Locator,
  name: string,
  height: number
): Promise<void> {
  await target.evaluate((el, h) => {
    el.style.boxSizing = 'border-box';
    el.style.height = `${h}px`;
    el.style.maxHeight = `${h}px`;
    el.style.minHeight = `${h}px`;
    el.style.overflow = 'hidden';
  }, height);
  const box = await target.boundingBox();
  if (!box) throw new Error(`No bounding box for ${name}`);
  await expect(target).toHaveScreenshot(name, {
    ...lockedShot,
    clip: {
      x: 0,
      y: 0,
      width: Math.floor(box.width),
      height
    }
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
    await expectLockedScreenshot(page.locator('.ui-diagram-page'), 'architecture.png', 1400);
  });

  test('impact empty state', async ({ page }) => {
    await openDemo(page);
    await page.goto(`/dashboard/${DEMO_REPO_ID}/impact`);
    await expect(page.getByRole('heading', { name: /^Impact$/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/What breaks if this module or PR changes/i)).toBeVisible();
    await settleFonts(page);
    await expectLockedScreenshot(page.locator('.ui-impact-page'), 'impact.png', 900);
  });
});
