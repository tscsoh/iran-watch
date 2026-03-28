import { test, expect, type Page } from '@playwright/test';

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

test.describe('Iran Watch', () => {
  test('loads the app shell without JS errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/');

    await expect(page.locator('.logo-mark')).toBeVisible();
    await expect(page.locator('#search')).toBeVisible();
    await expect(page.locator('#refreshBtn')).toBeVisible();

    expect(errors.filter((e) => !e.includes('favicon'))).toHaveLength(0);
  });

  test('fetches articles and renders at least 20 within 30 seconds', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);

    await page.goto('/');

    await expect(page.locator('#loadingStatus')).toBeHidden({ timeout: 30_000 });

    const cards = page.locator('.article-card');
    await expect(cards.first()).toBeVisible({ timeout: 5_000 });
    const count = await cards.count();

    console.log(`  → ${count} articles loaded`);
    expect(count).toBeGreaterThanOrEqual(20);

    const badge = await page.locator('#countBadge').textContent();
    expect(badge).toMatch(/\d+ articles?/);

    const realErrors = consoleErrors.filter(
      (e) => !e.includes('favicon') && !e.includes('ERR_ABORTED'),
    );
    if (realErrors.length > 0) {
      console.log('  Console errors detected:');
      realErrors.forEach((e) => console.log('    ✗', e));
    }
    expect(realErrors).toHaveLength(0);
  });

  test('source filter chips appear for loaded feeds', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#loadingStatus')).toBeHidden({ timeout: 30_000 });

    await expect(page.locator('.source-chip[data-source="all"]')).toBeVisible();

    const chips = page.locator('.source-chip:not([data-source="all"])');
    await expect(chips.first()).toBeVisible();
    const chipCount = await chips.count();
    expect(chipCount).toBeGreaterThanOrEqual(3);
  });

  test('source filter chip filters articles', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#loadingStatus')).toBeHidden({ timeout: 30_000 });
    await expect(page.locator('.article-card').first()).toBeVisible();

    const firstChip = page.locator('.source-chip:not([data-source="all"])').first();
    const sourceName = await firstChip.textContent();
    await firstChip.click();

    await expect(firstChip).toHaveClass(/active/);

    const sources = await page.locator('.article-source').allTextContents();
    const trimmed = sources.map((s) => s.trim());
    expect(trimmed.every((s) => s.includes(sourceName!.trim()))).toBe(true);
  });

  test('search filters articles by title', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#loadingStatus')).toBeHidden({ timeout: 30_000 });
    await expect(page.locator('.article-card').first()).toBeVisible();

    const totalBefore = await page.locator('.article-card').count();

    await page.fill('#search', 'zzznomatchxxx');
    await page.press('#search', 'Enter');
    await expect(page.locator('.state-view')).toBeVisible();

    await page.press('#search', 'Escape');
    const totalAfter = await page.locator('.article-card').count();
    expect(totalAfter).toBe(totalBefore);
  });

  test('settings panel opens and closes', async ({ page }) => {
    await page.goto('/');
    await page.click('#settingsBtn');
    await expect(page.locator('.settings-panel')).toBeVisible();

    await page.click('.close-btn');
    await expect(page.locator('.settings-panel')).toBeHidden();
  });

  test('each article card links to the original article', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.article-card').first()).toBeVisible({ timeout: 30_000 });

    const hrefs = await page.locator('.article-card').evaluateAll((cards) =>
      cards.slice(0, 5).map((c) => c.getAttribute('href')),
    );
    hrefs.forEach((href) => {
      expect(href).toMatch(/^https?:\/\//);
    });
  });

  test('proxy endpoint is reachable and returns XML', async ({ page }) => {
    const res = await page.request.get(
      '/proxy?url=' + encodeURIComponent('https://feeds.bbci.co.uk/news/world/rss.xml'),
    );
    expect(res.ok()).toBe(true);
    const body = await res.text();
    expect(body).toContain('<rss');
    expect(body).toContain('<item>');
  });
});
