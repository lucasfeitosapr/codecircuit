import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { openFreshBoard, importProject, componentsInView } from './ui';

// S-013: Fuse (root cause) and Capacitor (debt) are real parts: in the tray, and importable.
test.describe('Fuse and Capacitor parts (S-013)', () => {
  test('both appear in the parts tray @S-013', async ({ page }) => {
    await openFreshBoard(page);
    await expect(page.locator('#fuse-item')).toBeVisible();
    await expect(page.locator('#capacitor-item')).toBeVisible();
  });

  test('a content-only board with both imports with sizes and pins @S-013', async ({ page }) => {
    const part = (id: string, type: string, x: number) => ({ id, type, x, y: 200, title: id, status: 'todo', category: 'frontend', createdAt: '2026-11-18T00:00:00.000Z' });
    const board = {
      name: 'new parts', created: '2026-11-18T00:00:00.000Z', version: '1.0', metadata: {},
      components: [part('F', 'fuse', 400), part('C', 'capacitor', 600)],
      connections: [{ id: 'F-C', from: { componentId: 'F', pinIndex: 0 }, to: { componentId: 'C', pinIndex: 0 }, createdAt: '2026-11-18T00:00:00.000Z' }],
    };
    const file = test.info().outputPath('new-parts.json');
    writeFileSync(file, JSON.stringify(board));
    await openFreshBoard(page);
    await importProject(page, file);
    expect(await componentsInView(page)).toBe(2);
    const built = await page.evaluate(() =>
      (window as any).app.getCurrentViewComponents().map((c: any) => ({ type: c.type, w: c.width, pins: !!c.pins?.input?.length && !!c.pins?.output?.length }))
    );
    expect(built).toEqual([{ type: 'fuse', w: expect.any(Number), pins: true }, { type: 'capacitor', w: expect.any(Number), pins: true }]);
    expect(await page.evaluate(() => (window as any).app.getCurrentViewConnections().length)).toBe(1);
  });
});
