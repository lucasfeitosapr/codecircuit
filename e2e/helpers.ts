import { Page } from '@playwright/test';

/**
 * E2E test helpers for CodeCircuit 2D.
 *
 * The app is canvas-based so DOM queries won't find components.
 * We interact via the global `window.app` object exposed by main.ts.
 */

/** Wait for the app to be fully initialized (window.app exists and has components array). */
export async function waitForApp(page: Page) {
  await page.waitForFunction(() => {
    const app = (window as any).app;
    return app && typeof app.addComponent === 'function';
  }, undefined, { timeout: 10_000 });
}

/** Clear autosave data so we start with a clean board. */
export async function clearAutosave(page: Page) {
  await page.evaluate(() => localStorage.removeItem('codecircuit_autosave'));
}

/** Get the count of components in the current view. */
export async function getComponentCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const app = (window as any).app;
    return app.getCurrentViewComponents().length;
  });
}

/** Get an array of { id, title, type } for all components in the current view. */
export async function getComponents(page: Page): Promise<Array<{ id: string; title: string; type: string }>> {
  return page.evaluate(() => {
    const app = (window as any).app;
    return app.getCurrentViewComponents().map((c: any) => ({
      id: c.id,
      title: c.title,
      type: c.type,
    }));
  });
}

/** Get an array of { id, category } for all connections in the current view. */
export async function getConnections(page: Page): Promise<Array<{ id: string; category: string }>> {
  return page.evaluate(() => {
    const app = (window as any).app;
    return app.getCurrentViewConnections().map((c: any) => ({
      id: c.id,
      category: c.category,
    }));
  });
}

/** Add a component of `type` at canvas coords (x, y) via app API. Returns the component. */
export async function addComponent(page: Page, type: string, x: number, y: number) {
  return page.evaluate(({ type, x, y }) => {
    const app = (window as any).app;
    const comp = app.addComponent(type, x, y);
    if (!comp) return null;
    return { id: comp.id, title: comp.title, type: comp.type };
  }, { type, x, y });
}

/** Check whether the datasheet panel is visible. */
export async function isDatasheetVisible(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const panel = document.getElementById('datasheet-panel');
    return panel ? panel.style.display !== 'none' && panel.classList.contains('active') : false;
  });
}

/** Get the full export data from the app via the same path the Export button uses. */
export async function exportProjectData(page: Page): Promise<any> {
  return page.evaluate(() => {
    return new Promise((resolve) => {
      const app = (window as any).app;
      const components = app.components;
      const connections = app.connections;
      // Use the ExportImportManager's data export
      const exportImportManager = (app as any).exportImportManager;
      if (exportImportManager && typeof exportImportManager.exportProjectData === 'function') {
        const data = exportImportManager.exportProjectData(components, connections);
        resolve(data);
      } else {
        // Fallback: manual serialization
        resolve({ components, connections });
      }
    });
  });
}

/** Import project data into the app. */
export async function importProjectData(page: Page, data: any) {
  await page.evaluate((projectData) => {
    const app = (window as any).app;
    app.importProjectData(projectData);
  }, data);
}

/** Select a component by clicking on it (via app API since it's canvas-based). */
export async function selectComponent(page: Page, componentId: string) {
  await page.evaluate((id) => {
    const app = (window as any).app;
    const components = app.getCurrentViewComponents();
    const comp = components.find((c: any) => c.id === id);
    if (comp) {
      app.appStateManager.setSelectedComponent(comp);
      app.showDatasheet(comp);
    }
  }, componentId);
}

/** Delete a component by emitting the delete event. */
export async function deleteComponent(page: Page, componentId: string) {
  await page.evaluate((id) => {
    const { eventBus } = (window as any).__codecircuit_internals || {};
    if (eventBus) {
      eventBus.emit('component.delete.requested', { componentId: id, timestamp: Date.now() });
    } else {
      // Fallback: try to access via module imports cached on window
      const app = (window as any).app;
      // Select and press Delete key simulation
      const components = app.getCurrentViewComponents();
      const comp = components.find((c: any) => c.id === id);
      if (comp) {
        app.appStateManager.setSelectedComponent(comp);
        app.appStateManager.addToSelection(comp);
      }
    }
  }, componentId);
}
