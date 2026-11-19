import { test, expect, Page } from '@playwright/test';
import { openFreshBoard, dropFromTray, clickAt, clickEmpty, waitForNotifications } from './ui';

/**
 * Keyboard shortcuts (card pending-shortcuts, S-011; debt D-010: input handled in several places).
 * Each key press must do exactly one thing.
 */
async function partWithPanel(page: Page) {
  await openFreshBoard(page);
  const center = await dropFromTray(page, 'module-ic', 420, 260);
  await waitForNotifications(page);
  await clickAt(page, center.x, center.y);
  await expect(page.locator('#comp-status')).toBeVisible();
  return center;
}
const statusOf = (page: Page) => page.evaluate(() => (window as any).app.getCurrentViewComponents()[0]?.status);
const CYCLE = ['defined', 'todo', 'in-progress', 'done'];

test.describe('Keyboard: one action per key press', () => {
  test('Esc while connecting leaves connection mode and keeps the selection @B-024', async ({ page }) => {
    await partWithPanel(page);
    // Output pin of a Module IC dropped at (420, 260): right edge, middle.
    await clickAt(page, 420 + 100, 260 + 30);
    await expect(page.locator('#connection-mode')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#connection-mode')).toBeHidden();
    // One step per press: the selection is still there.
    await expect(page.locator('#comp-status')).toBeVisible();
  });

  test('Space advances the status by exactly one step and the panel shows it @B-026', async ({ page }) => {
    await partWithPanel(page);
    const before = await statusOf(page);
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);
    const after = await statusOf(page);
    expect(after).toBe(CYCLE[(CYCLE.indexOf(before) + 1) % CYCLE.length]);
    await expect(page.locator('#comp-status')).toHaveValue(after);
  });

  test('F1 opens the help overlay, and F1 again closes it @B-027', async ({ page }) => {
    await openFreshBoard(page);
    await clickEmpty(page);
    await page.keyboard.press('F1');
    await expect(page.locator('#help-overlay')).toHaveClass(/active/);
    await page.keyboard.press('F1');
    await expect(page.locator('#help-overlay')).not.toHaveClass(/active/);
  });

  test('Ctrl+F opens the feature-flags bar, also with Caps Lock on @B-025', async ({ page }) => {
    await openFreshBoard(page);
    // Caps Lock on: the key value is 'F' without Shift.
    await page.evaluate(() =>
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F', ctrlKey: true, bubbles: true }))
    );
    await expect(page.getByText('Click to collapse')).toBeVisible();
  });
});
