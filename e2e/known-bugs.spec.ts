import { test, expect } from '@playwright/test';
import {
  openFreshBoard, dropFromTray, enterModule, pressBack, reloadPage, waitForAutosave,
  dragOnCanvas, clickAt, clickEmpty, expectSelectable, componentsInView, detailsPanelOpen,
  moduleContentCount, countsPerLevel,
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

  test('nested content survives reload, then a second edit', { tag: ['@B-001', '@D-002'] }, async ({ page }) => {
    // Card goal: survives Back, re-entry and reload. The first-pass repro saw
    // view and module arrays split after reload + re-enter.
    const mod = await dropFromTray(page, 'module-ic', 700, 300);
    await enterModule(page, mod);
    await dropFromTray(page, 'task-resistor', 450, 200);
    await pressBack(page);
    await waitForAutosave(page);

    await reloadPage(page);
    await enterModule(page, mod);
    expect(await componentsInView(page)).toBe(1);
    await dropFromTray(page, 'task-resistor', 650, 200);
    await waitForAutosave(page);
    await dropFromTray(page, 'task-resistor', 450, 450);
    await pressBack(page);
    await enterModule(page, mod);
    expect(await componentsInView(page)).toBe(3);
  });

  for (const depth of [3, 6]) {
    test(`a ${depth}-level build keeps every level's content`, { tag: ['@B-001', '@D-002'] }, async ({ page }) => {
      test.setTimeout(90_000);
      // Each level: a resistor, an autosave, then a module to go deeper.
      // The deepest level holds only a resistor.
      for (let level = 1; level <= depth; level++) {
        await dropFromTray(page, 'task-resistor', 450, 200);
        await waitForAutosave(page);
        if (level < depth) {
          const mod = await dropFromTray(page, 'module-ic', 700, 300);
          await enterModule(page, mod);
        }
      }
      const expected = [...Array(depth - 1).fill(2), 1];
      for (let level = 1; level < depth; level++) {
        await pressBack(page);
        await waitForAutosave(page);
      }
      expect(await countsPerLevel(page)).toEqual(expected);

      // Entering nested modules after reload is blocked by B-004, so read the levels.
      await reloadPage(page);
      expect(await countsPerLevel(page)).toEqual(expected);
    });
  }

  test('undo inside a module keeps view and module in step', { tag: ['@B-001', '@D-002'] }, async ({ page }) => {
    // Guard for the B-001 fix: undo used to replace the view's arrays, and only
    // autosave's copy-back (removed in the fix) brought the module up to date.
    const mod = await dropFromTray(page, 'module-ic', 700, 300);
    await enterModule(page, mod);
    await dropFromTray(page, 'task-resistor', 450, 200);
    await dropFromTray(page, 'task-resistor', 650, 200);
    await dropFromTray(page, 'task-resistor', 450, 450);
    expect(await componentsInView(page)).toBe(3);

    await clickEmpty(page);
    await page.keyboard.press('Control+z');
    expect(await componentsInView(page)).toBe(2);

    // Autosave no longer copies the view back, so only undo itself can keep
    // the module current. Read the module directly: re-entering after an undo
    // is blocked by B-018 (tested below).
    await pressBack(page);
    await waitForAutosave(page);
    expect(await moduleContentCount(page)).toBe(2);
  });

  test('a module stays enterable after an undo inside it', { tag: ['@B-018', '@D-001'] }, async ({ page }) => {
    test.fail(true, 'B-018 open: undo inside a module leaves the main board out of the spatial index');

    const mod = await dropFromTray(page, 'module-ic', 700, 300);
    await enterModule(page, mod);
    await dropFromTray(page, 'task-resistor', 450, 200);
    await dropFromTray(page, 'task-resistor', 650, 200);
    await clickEmpty(page);
    await page.keyboard.press('Control+z');
    await pressBack(page);
    await waitForAutosave(page);

    await enterModule(page, mod);
    // Main board has 1 part; inside the module there is 1 after the undo.
    // Assert we actually left the main board.
    expect(await page.evaluate(() => (window as any).app.appStateManager.getCurrentView().type)).toBe('schematic');
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
