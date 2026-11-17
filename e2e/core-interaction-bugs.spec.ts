import { test, expect } from '@playwright/test';
import {
  openFreshBoard, dropFromTray, enterModule, pressBack, reloadPage, waitForAutosave,
  componentsInView, componentIdsInView, expectSelectable, deleteAt, resetBoard,
  exportProject, importProject, titleAt,
} from './ui';

/**
 * Core interaction bugs: regression tests through the real UI.
 *
 * Ported from window.app calls to the UI helpers in ./ui.ts (debt map M-004, D-007).
 * Actions are what a person does; app state is only read for what the UI doesn't show
 * (how many parts a view holds, their ids).
 *
 * A test tagged with a debt-map bug ID and marked test.fail() is a known open bug,
 * same convention as known-bugs.spec.ts.
 */

test.describe('Core interaction bugs', () => {
  test.beforeEach(async ({ page }) => {
    await openFreshBoard(page);
  });

  // ─── Bug #1: Component duplication on autosave restore ───────────

  test('Bug #1: page reload does not duplicate components', async ({ page }) => {
    await dropFromTray(page, 'power-core', 400, 200);
    await dropFromTray(page, 'task-resistor', 600, 200);
    await dropFromTray(page, 'module-ic', 500, 350);
    expect(await componentsInView(page)).toBe(3);

    await waitForAutosave(page);
    await reloadPage(page);

    expect(await componentsInView(page)).toBe(3);
    const ids = await componentIdsInView(page);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('Bug #1: reload twice still does not increase count', async ({ page }) => {
    await dropFromTray(page, 'power-core', 400, 200);
    await dropFromTray(page, 'task-resistor', 600, 200);
    await waitForAutosave(page);

    await reloadPage(page);
    await waitForAutosave(page);
    await reloadPage(page);

    expect(await componentsInView(page)).toBe(2);
  });

  // ─── Bug #2: Component deletion breaks the UI ────────────────────

  test('Bug #2: deleting a component does not break the Details panel', async ({ page }) => {
    const first = await dropFromTray(page, 'task-resistor', 400, 200);
    const second = await dropFromTray(page, 'task-resistor', 600, 200);
    const idsBefore = await componentIdsInView(page);
    expect(idsBefore.length).toBe(2);

    await deleteAt(page, first);

    const remaining = await componentIdsInView(page);
    expect(remaining.length).toBe(1);
    expect(remaining[0]).toBe(idsBefore[1]);
    await expectSelectable(page, second);
  });

  // ─── Bug #4: Component name collisions ───────────────────────────

  test('Bug #4: component names are unique across nesting levels', async ({ page }) => {
    const a = await dropFromTray(page, 'task-resistor', 400, 200);
    const b = await dropFromTray(page, 'task-resistor', 600, 200);
    const mod = await dropFromTray(page, 'module-ic', 500, 400);
    const titles = [await titleAt(page, a), await titleAt(page, b)];

    await enterModule(page, mod);
    const inner = await dropFromTray(page, 'task-resistor', 500, 200);
    titles.push(await titleAt(page, inner));

    expect(new Set(titles).size).toBe(titles.length);
  });

  // ─── Bug #5: Reset Board ─────────────────────────────────────────

  test('Bug #5: board reset works cleanly', { tag: ['@B-016', '@D-006'] }, async ({ page }) => {
    // The old window.app version cleared localStorage by hand, which hid this.
    test.fail(true, 'B-016 open: Reset Board does not update the autosave, so reload restores the old board');

    await dropFromTray(page, 'power-core', 400, 200);
    await dropFromTray(page, 'task-resistor', 600, 200);
    await waitForAutosave(page);

    await resetBoard(page);
    expect(await componentsInView(page)).toBe(0);

    await waitForAutosave(page);
    await reloadPage(page);
    expect(await componentsInView(page)).toBe(0);
  });

  // ─── Bug #7: Module IC data loss on import ───────────────────────

  test('Bug #7: export/import preserves nested Module IC data', async ({ page }) => {
    const mod = await dropFromTray(page, 'module-ic', 500, 300);
    await enterModule(page, mod);
    await dropFromTray(page, 'task-resistor', 400, 150);
    await dropFromTray(page, 'task-resistor', 600, 150);
    expect(await componentsInView(page)).toBe(2);
    await pressBack(page);

    const exported = await exportProject(page);
    const exportedModule = exported.data.components.find((c: any) => c.type === 'module-ic');
    expect(exportedModule?.internalComponents?.length).toBe(2);

    await resetBoard(page);
    expect(await componentsInView(page)).toBe(0);

    await importProject(page, exported.path);
    expect(await componentsInView(page)).toBe(1);

    await enterModule(page, mod);
    expect(await componentsInView(page)).toBe(2);
  });
});
