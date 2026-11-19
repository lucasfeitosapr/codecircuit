import { test, expect, Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { openFreshBoard, importProject, clickAt, clickEmpty, centerOf } from './ui';

// S-014: under selection focus, a done part shows its category color instead of status green.
const P = { x: 420, y: 220 };

/** Mean color of the part's top border line (canvas pixels, read-only). */
async function borderColor(page: Page) {
  return page.evaluate(({ x, y }) => {
    const canvas = document.getElementById('circuit-board') as HTMLCanvasElement;
    const dpr = window.devicePixelRatio || 1;
    const d = canvas.getContext('2d')!.getImageData((x + 20) * dpr, y * dpr, 60 * dpr, 1).data;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
    const n = d.length / 4;
    return { r: r / n, g: g / n, b: b / n };
  }, P);
}

test('a done part shows its category color under focus @S-014', async ({ page }) => {
  const board = {
    name: 'true colors', created: '2026-11-19T00:00:00.000Z', version: '1.0', metadata: {},
    components: [{ id: 'A', type: 'module-ic', x: P.x, y: P.y, title: 'A', status: 'done', category: 'security', createdAt: '2026-11-19T00:00:00.000Z', internalComponents: [], internalConnections: [] }],
    connections: [],
  };
  const file = test.info().outputPath('true-colors.json');
  writeFileSync(file, JSON.stringify(board));
  await openFreshBoard(page);
  await importProject(page, file);
  await clickEmpty(page);
  await page.waitForTimeout(200);
  const before = await borderColor(page);
  expect(before.g).toBeGreaterThan(before.r); // done = green

  const c = centerOf('module-ic', P.x, P.y);
  await clickAt(page, c.x, c.y);
  await page.waitForTimeout(250);
  const after = await borderColor(page);
  expect(after.r).toBeGreaterThan(after.g); // security = pink/red, not green
});
