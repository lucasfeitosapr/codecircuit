import { test, expect } from '@playwright/test';
import { openFreshBoard } from './ui';

test.describe('FX panel and profiler page (COD-279)', () => {
  test('the FX button opens the FX panel, and a second click closes it @B-012', async ({ page }) => {
    await openFreshBoard(page);
    await page.click('#fx-btn');
    await expect(page.locator('#fx-panel')).toBeVisible();
    await page.click('#fx-btn');
    await expect(page.locator('#fx-panel')).toBeHidden();
  });

  test('the profiler profiles a generated board and exports a CSV @B-013', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/profiling.html');
    await page.getByRole('button', { name: 'Generate Test Board' }).click();
    await page.getByRole('button', { name: 'Start Profiling' }).click();
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: 'Stop Profiling' }).click();
    await expect(page.locator('#report')).toContainText('Avg FPS');

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 5000 }),
      page.getByRole('button', { name: 'Export CSV' }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
    expect(errors).toEqual([]);
  });
});
