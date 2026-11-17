import { test, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { openFreshBoard, importProject, componentsInView } from './ui';

/**
 * Contract check for the local debt-map board (debt-map/codecircuit_board.json).
 *
 * The file is written by debt-map/tools/debtmap.py with content only (type, position,
 * title, status...). Import must fill size, pins and trace positions from the part types.
 * If the import format drifts, this fails loudly instead of the board silently breaking.
 *
 * debt-map/ is local-only, so the test skips when the file isn't there.
 * Override the path with DEBTMAP_BOARD.
 */
const boardPath = resolve(process.env.DEBTMAP_BOARD ?? 'debt-map/codecircuit_board.json');

test.describe('Debt-map board import (contract)', () => {
  test.skip(!existsSync(boardPath), `no board at ${boardPath}`);

  test('imports every part and trace, with display fields filled from the part type', async ({ page }) => {
    const board = JSON.parse(readFileSync(boardPath, 'utf-8'));
    await openFreshBoard(page);
    await importProject(page, boardPath);

    expect(await componentsInView(page)).toBe(board.components.length);

    // Read-only check of what Import built (the UI can't show pins or trace coordinates).
    const built = await page.evaluate(() => {
      const app = (window as any).app;
      const parts = app.getCurrentViewComponents();
      const traces = app.getCurrentViewConnections();
      return {
        traces: traces.length,
        partsWithoutPins: parts.filter((c: any) => !c.pins?.input || !c.pins?.output).map((c: any) => c.id),
        partsWithoutSize: parts.filter((c: any) => !(c.width > 0 && c.height > 0)).map((c: any) => c.id),
        tracesWithoutCoords: traces
          .filter((t: any) => [t.from.x, t.from.y, t.to.x, t.to.y].some(v => typeof v !== 'number'))
          .map((t: any) => t.id),
      };
    });

    expect(built.traces).toBe(board.connections.length);
    expect(built.partsWithoutPins).toEqual([]);
    expect(built.partsWithoutSize).toEqual([]);
    expect(built.tracesWithoutCoords).toEqual([]);

    await page.screenshot({ path: test.info().outputPath('debt-map-board.png') });
  });
});
