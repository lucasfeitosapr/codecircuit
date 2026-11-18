import { test, expect, Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { openFreshBoard, importProject, clickAt, clickEmpty, centerOf } from './ui';

/**
 * S-006: selecting a part keeps it, its traces and the parts at their other ends bright;
 * everything else is dimmed. Checked on real canvas pixels, read-only.
 */

// A -> B wired, C on its own. Kept between the parts tray (x < ~300) and the details panel (x > ~950).
const A = { x: 360, y: 160 };
const B = { x: 620, y: 160 };
const C = { x: 620, y: 380 };

function board() {
  const part = (id: string, p: { x: number; y: number }) => ({
    id, type: 'module-ic', x: p.x, y: p.y, title: id, status: 'done', category: 'frontend',
    createdAt: '2026-11-18T00:00:00.000Z', internalComponents: [], internalConnections: [],
  });
  return {
    name: 'selection focus', created: '2026-11-18T00:00:00.000Z', version: '1.0', metadata: {},
    components: [part('A', A), part('B', B), part('C', C)],
    connections: [{ id: 'A-B', from: { componentId: 'A', pinIndex: 0 }, to: { componentId: 'B', pinIndex: 0 },
      createdAt: '2026-11-18T00:00:00.000Z' }],
  };
}

/** Mean brightness (0-255) of the canvas over a part's rectangle. */
async function brightness(page: Page, p: { x: number; y: number }) {
  return page.evaluate(({ x, y }) => {
    const canvas = document.getElementById('circuit-board') as HTMLCanvasElement;
    const dpr = window.devicePixelRatio || 1;
    const d = canvas.getContext('2d')!.getImageData(x * dpr, y * dpr, 100 * dpr, 60 * dpr).data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) sum += (d[i] + d[i + 1] + d[i + 2]) / 3;
    return sum / (d.length / 4);
  }, p);
}

test.describe('Selection focus (S-006)', () => {
  test.beforeEach(async ({ page }) => {
    const file = test.info().outputPath('focus-board.json');
    writeFileSync(file, JSON.stringify(board()));
    await openFreshBoard(page);
    await importProject(page, file);
    await clickEmpty(page);
    await page.waitForTimeout(200);
  });

  test('selecting a part dims what is not connected to it @S-006', async ({ page }) => {
    const before = { b: await brightness(page, B), c: await brightness(page, C) };

    const a = centerOf('module-ic', A.x, A.y);
    await clickAt(page, a.x, a.y);
    await page.waitForTimeout(200);
    const after = { b: await brightness(page, B), c: await brightness(page, C) };

    expect(after.c).toBeLessThan(before.c * 0.7); // C is not wired to A: dimmed
    expect(after.b).toBeGreaterThan(before.b * 0.9); // B is wired to A: stays bright
  });

  test('clearing the selection brings everything back @S-006', async ({ page }) => {
    const before = await brightness(page, C);
    const a = centerOf('module-ic', A.x, A.y);
    await clickAt(page, a.x, a.y);
    await clickEmpty(page);
    await page.waitForTimeout(200);
    expect(await brightness(page, C)).toBeGreaterThan(before * 0.9);
  });
});
