import { test, expect } from '@playwright/test';
import {
  openFreshBoard, dropFromTray, enterModule, pressBack, reloadPage, waitForAutosave,
  dragOnCanvas, clickAt, clickEmpty, expectSelectable, componentsInView, detailsPanelOpen,
} from './ui';

/**
 * Known bugs, reproduced through the real UI.
 *
 * Each test describes the CORRECT behavior and is tagged with its debt-map ID.
 * `test.fail()` marks a bug that is still open: the test is expected to fail.
 * When a fix lands, Playwright reports "expected to fail but passed".
 * That's the signal to remove test.fail() and close the bug in debt-map/map.yaml.
 */

test.describe('Known bugs (debt map)', () => {
  test.beforeEach(async ({ page }) => {
    await openFreshBoard(page);
  });

  test('nested content survives an autosave while nested', { tag: ['@B-001', '@D-002'] }, async ({ page }) => {
    test.fail(true, 'B-001 open: autosave replaces the module array while nested');

    const mod = await dropFromTray(page, 'module-ic', 700, 300);
    await enterModule(page, mod);
    await dropFromTray(page, 'task-resistor', 450, 200);
    await waitForAutosave(page);
    await dropFromTray(page, 'task-resistor', 650, 200);
    expect(await componentsInView(page)).toBe(2);

    await pressBack(page);
    await waitForAutosave(page);
    await enterModule(page, mod);

    expect(await componentsInView(page)).toBe(2);
  });

  test('a moved component stays selectable on a busy board', { tag: ['@B-002', '@D-001'] }, async ({ page }) => {
    test.fail(true, 'B-002 open: drag does not update the spatial index');

    // More than 10 components so the spatial index splits into cells.
    for (let i = 0; i < 11; i++) {
      await dropFromTray(page, 'task-resistor', 350 + (i % 6) * 120, 120 + Math.floor(i / 6) * 140);
    }
    const start = await dropFromTray(page, 'task-resistor', 400, 500);
    await expectSelectable(page, start);

    const end = { x: 1100, y: 530 };
    await clickEmpty(page);
    await dragOnCanvas(page, start, end);

    await expectSelectable(page, end);
  });

  test('a pasted copy is selectable', { tag: ['@B-003', '@D-001'] }, async ({ page }) => {
    test.fail(true, 'B-003 open: paste bypasses the spatial index');

    const original = await dropFromTray(page, 'task-resistor', 500, 300);
    await clickAt(page, original.x, original.y);
    expect(await detailsPanelOpen(page)).toBe(true);

    await page.keyboard.press('Control+c');
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(300);

    const copy = { x: original.x + 30, y: original.y + 30 }; // PASTE_OFFSET = 30
    await expectSelectable(page, copy);
  });

  test('a nested component is selectable after reload', { tag: ['@B-004', '@D-001'] }, async ({ page }) => {
    test.fail(true, 'B-004 open: nested components are not re-indexed after load');

    const mod = await dropFromTray(page, 'module-ic', 700, 300);
    await enterModule(page, mod);
    const inner = await dropFromTray(page, 'task-resistor', 500, 200);
    await expectSelectable(page, inner);

    await pressBack(page);
    await waitForAutosave(page);
    await reloadPage(page);
    await enterModule(page, mod);
    expect(await componentsInView(page)).toBe(1);

    await expectSelectable(page, inner);
  });
});
