import { test, expect } from '@playwright/test';
import { deriveRepositoryId } from '@repopilot/common';
import { DASHBOARD_PAGES, DEMO_CHIP_LABEL, DEMO_REPO_SLUG } from './routes';

const DEMO_REPO_ID = deriveRepositoryId(DEMO_REPO_SLUG);

async function openDemoDashboard(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: DEMO_CHIP_LABEL }).click();
  await page.waitForURL(`**/dashboard/${DEMO_REPO_ID}**`, { timeout: 30_000 });
}

test.describe('demo dashboard — 100% nav coverage', () => {
  test.beforeEach(async ({ page }) => {
    await openDemoDashboard(page);
  });

  for (const route of DASHBOARD_PAGES) {
    test(`renders ${route.nav}`, async ({ page }) => {
      if (route.path) {
        await page.getByRole('link', { name: route.nav, exact: true }).click();
        await page.waitForURL(`**/dashboard/${DEMO_REPO_ID}${route.path}**`);
      }
      await expect(page.getByText(route.expect).first()).toBeVisible();
    });
  }

  test('renders dashboard MCP page', async ({ page }) => {
    await page.goto(`/dashboard/${DEMO_REPO_ID}/mcp`);
    await expect(page.getByRole('heading', { name: /Connect Cursor \/ MCP/i })).toBeVisible();
  });

  test('renders pull request detail in demo mode', async ({ page }) => {
    await page.goto(`/dashboard/${DEMO_REPO_ID}/pulls`);
    await page.getByRole('link', { name: '#42' }).click();
    await expect(page.getByText(/GitHub OAuth|review|finding/i).first()).toBeVisible();
  });

  test('ask flow returns a demo answer', async ({ page }) => {
    await page.goto(`/dashboard/${DEMO_REPO_ID}/ask`);
    await page.getByRole('button', { name: 'What does syncRepository do?' }).click();
    await expect(page.getByText(/syncRepository|repository sync|demo/i).first()).toBeVisible({
      timeout: 15_000
    });
  });

  test('search returns demo hits', async ({ page }) => {
    await page.goto(`/dashboard/${DEMO_REPO_ID}/search`);
    await page.getByLabel('Search query').fill('sync');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.locator('.ui-search-hit').first()).toBeVisible({
      timeout: 15_000
    });
  });
});
