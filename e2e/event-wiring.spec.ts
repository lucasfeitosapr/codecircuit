import { test, expect } from '@playwright/test';
import { openFreshBoard, dropFromTray, clickAt, waitForNotifications } from './ui';

/**
 * Guards for the event-graph extractor's findings (debt-map/structure/EVENT_GRAPH.md).
 * Space sends 'component.status.toggled', which nothing hears (D-008). Checked 18/nov:
 * the details panel still refreshes through another path, so this is dead wiring, not a bug.
 * This test keeps it that way while the wiring is cleaned up.
 */
test.describe('Event wiring (extractor findings)', () => {
  test('Space toggles status and the details panel shows the new status', async ({ page }) => {
    await openFreshBoard(page);
    const center = await dropFromTray(page, 'module-ic', 420, 260);
    await waitForNotifications(page);
    await clickAt(page, center.x, center.y);
    await expect(page.locator('#comp-status')).toBeVisible();
    const before = await page.inputValue('#comp-status');

    await page.keyboard.press('Space');
    await page.waitForTimeout(300);

    // The part itself changed (read-only check; the canvas doesn't show the value as text).
    const stored = await page.evaluate(() => (window as any).app.getCurrentViewComponents()[0]?.status);
    expect(stored).not.toBe(before);
    // What the person sees in the panel must match.
    await expect(page.locator('#comp-status')).toHaveValue(stored);
  });
});
