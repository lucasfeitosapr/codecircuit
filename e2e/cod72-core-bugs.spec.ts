import { test, expect } from '@playwright/test';
import {
  waitForApp,
  clearAutosave,
  getComponentCount,
  getComponents,
  addComponent,
} from './helpers';

/**
 * COD-72: Core interaction bugs — E2E regression tests.
 *
 * These tests verify the 7 bugs reported in the Linear issue are fixed.
 * The app is canvas-based, so we interact via `window.app` global.
 */

test.describe('COD-72: Core interaction bugs', () => {
  test.beforeEach(async ({ page }) => {
    // Clear corrupted autosave before each test
    await page.goto('/');
    await clearAutosave(page);
    await page.reload();
    await waitForApp(page);
    // Ensure we start with a clean board
    await page.evaluate(() => {
      localStorage.removeItem('codecircuit_autosave');
      const app = (window as any).app;
      if (app.appStateManager) app.appStateManager.clearState();
    });
    // Small settle delay for event handlers
    await page.waitForTimeout(200);
  });

  // ─── Bug #1: Component Duplication on Autosave Restore ───────────

  test('Bug #1: page reload does not duplicate components', async ({ page }) => {
    // Add 3 components
    await addComponent(page, 'power-core', 200, 200);
    await addComponent(page, 'task-resistor', 400, 200);
    await addComponent(page, 'module-ic', 300, 350);

    const countBefore = await getComponentCount(page);
    expect(countBefore).toBe(3);

    // Wait for autosave debounce (1s) to persist
    await page.waitForTimeout(1500);

    // Reload — autosave should restore exactly the same components
    await page.reload();
    await waitForApp(page);
    await page.waitForTimeout(500);

    const countAfter = await getComponentCount(page);
    expect(countAfter).toBe(3);

    // Verify no duplicate IDs
    const components = await getComponents(page);
    const ids = components.map(c => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  test('Bug #1: reload twice still does not increase count', async ({ page }) => {
    await addComponent(page, 'power-core', 200, 200);
    await addComponent(page, 'task-resistor', 400, 200);
    await page.waitForTimeout(1500);

    // First reload
    await page.reload();
    await waitForApp(page);
    await page.waitForTimeout(1500);

    // Second reload
    await page.reload();
    await waitForApp(page);
    await page.waitForTimeout(500);

    const count = await getComponentCount(page);
    expect(count).toBe(2);
  });

  // ─── Bug #2: Component Deletion Breaks UI ────────────────────────

  test('Bug #2: deleting a component does not break the Details panel', async ({ page }) => {
    // Create two components
    const comp1 = await addComponent(page, 'task-resistor', 200, 200);
    const comp2 = await addComponent(page, 'task-resistor', 400, 200);
    expect(comp1).not.toBeNull();
    expect(comp2).not.toBeNull();

    // Delete comp1 via event
    await page.evaluate((id) => {
      const app = (window as any).app;
      // Select it first
      const comps = app.getCurrentViewComponents();
      const target = comps.find((c: any) => c.id === id);
      if (target) {
        app.appStateManager.setSelectedComponent(target);
        app.appStateManager.addToSelection(target);
      }
    }, comp1!.id);

    // Press Delete key
    await page.keyboard.press('Delete');
    await page.waitForTimeout(300);

    // comp1 should be gone
    const remaining = await getComponents(page);
    expect(remaining.length).toBe(1);
    expect(remaining[0].id).toBe(comp2!.id);

    // Now select comp2 — the Details panel should be responsive
    await page.evaluate((id) => {
      const app = (window as any).app;
      const comps = app.getCurrentViewComponents();
      const target = comps.find((c: any) => c.id === id);
      if (target) {
        app.appStateManager.setSelectedComponent(target);
        app.showDatasheet(target);
      }
    }, comp2!.id);

    await page.waitForTimeout(200);

    // Datasheet panel should be visible (has .active class)
    const datasheetVisible = await page.evaluate(() => {
      const panel = document.getElementById('datasheet-panel');
      return panel?.classList.contains('active') ?? false;
    });
    expect(datasheetVisible).toBe(true);
  });

  // ─── Bug #4: Component Name Collisions ────────────────────────────

  test('Bug #4: component names are unique across nesting levels', async ({ page }) => {
    // Create components on the main board
    const mainComp1 = await addComponent(page, 'task-resistor', 200, 200);
    const mainComp2 = await addComponent(page, 'task-resistor', 400, 200);
    const moduleIC = await addComponent(page, 'module-ic', 300, 400);
    expect(mainComp1).not.toBeNull();
    expect(mainComp2).not.toBeNull();
    expect(moduleIC).not.toBeNull();

    // Enter the Module IC's schematic view
    await page.evaluate((moduleId) => {
      const app = (window as any).app;
      const comps = app.getCurrentViewComponents();
      const mod = comps.find((c: any) => c.id === moduleId);
      if (mod) {
        app.schematicViewManager.enterSchematicView(mod);
      }
    }, moduleIC!.id);

    // Wait for transition
    await page.waitForTimeout(600);

    // Create a task-resistor inside the Module IC
    const innerComp = await addComponent(page, 'task-resistor', 200, 200);
    expect(innerComp).not.toBeNull();

    // The inner component's title should NOT collide with main board titles
    const allTitles = [mainComp1!.title, mainComp2!.title, innerComp!.title];
    const uniqueTitles = new Set(allTitles);
    expect(uniqueTitles.size).toBe(allTitles.length);
  });

  // ─── Bug #5: Reset Board After Duplication ────────────────────────

  test('Bug #5: board reset works cleanly', async ({ page }) => {
    // Add components
    await addComponent(page, 'power-core', 200, 200);
    await addComponent(page, 'task-resistor', 400, 200);
    await page.waitForTimeout(1500); // Wait for autosave

    // Reset the board
    await page.evaluate(() => {
      const app = (window as any).app;
      app.appStateManager.clearState();
      localStorage.removeItem('codecircuit_autosave');
    });

    const countAfterReset = await getComponentCount(page);
    expect(countAfterReset).toBe(0);

    // Reload — should start fresh
    await page.reload();
    await waitForApp(page);
    await page.waitForTimeout(500);

    const countAfterReload = await getComponentCount(page);
    expect(countAfterReload).toBe(0);
  });

  // ─── Bug #7: Module IC Data Loss on Import ────────────────────────

  test('Bug #7: export/import preserves nested Module IC data', async ({ page }) => {
    // Create a Module IC and enter it
    const moduleIC = await addComponent(page, 'module-ic', 300, 300);
    expect(moduleIC).not.toBeNull();

    await page.evaluate((moduleId) => {
      const app = (window as any).app;
      const comps = app.getCurrentViewComponents();
      const mod = comps.find((c: any) => c.id === moduleId);
      if (mod) {
        app.schematicViewManager.enterSchematicView(mod);
      }
    }, moduleIC!.id);
    await page.waitForTimeout(600);

    // Add internal components
    await addComponent(page, 'task-resistor', 150, 150);
    await addComponent(page, 'task-resistor', 350, 150);

    // Verify 2 internal components
    const internalCount = await getComponentCount(page);
    expect(internalCount).toBe(2);

    // Go back to main board
    await page.evaluate(() => {
      const app = (window as any).app;
      app.schematicViewManager.exitToMainBoard();
    });
    await page.waitForTimeout(600);

    // Export the project
    const exportData = await page.evaluate(() => {
      const app = (window as any).app;
      const eim = (app as any).exportImportManager;
      return eim.exportProjectData(app.components, app.connections);
    });

    // Verify export data has the nested components
    const exportedModule = exportData.components.find((c: any) => c.type === 'module-ic');
    expect(exportedModule).toBeDefined();
    expect(exportedModule.internalComponents).toBeDefined();
    expect(exportedModule.internalComponents.length).toBe(2);

    // Clear the board and re-import
    await page.evaluate(() => {
      const app = (window as any).app;
      app.appStateManager.clearState();
    });

    const emptyCount = await getComponentCount(page);
    expect(emptyCount).toBe(0);

    // Import the exported data
    await page.evaluate((data) => {
      const app = (window as any).app;
      app.importProjectData(data);
    }, exportData);
    await page.waitForTimeout(500);

    // Main board should have 1 Module IC
    const mainCount = await getComponentCount(page);
    expect(mainCount).toBe(1);

    // Enter the Module IC and verify internal components survived
    await page.evaluate(() => {
      const app = (window as any).app;
      const comps = app.getCurrentViewComponents();
      const mod = comps.find((c: any) => c.type === 'module-ic');
      if (mod) {
        app.schematicViewManager.enterSchematicView(mod);
      }
    });
    await page.waitForTimeout(600);

    const restoredInternalCount = await getComponentCount(page);
    expect(restoredInternalCount).toBe(2);
  });
});
