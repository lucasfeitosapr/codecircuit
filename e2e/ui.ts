import { Page, expect } from '@playwright/test';

/**
 * Real-UI helpers for CodeCircuit 2D.
 *
 * Actions go through the same paths a person uses: drag from the parts tray,
 * mouse clicks and drags on the canvas, double-click to enter a Module IC,
 * the Back button, keyboard shortcuts, page reloads.
 *
 * Assertions prefer what a person can see (details panel, breadcrumb).
 * Reading app state is allowed only for things the UI doesn't show, such as
 * how many components a view holds. Never mutate state through window.app here.
 *
 * Coordinates are canvas pixels (top-left of the canvas = 0,0). The parts tray
 * overlaps the left side of the canvas, so keep x above ~300.
 */

export type PartType = 'power-core' | 'module-ic' | 'task-resistor' | 'decision-point' | 'gateway';

/** Size of each part when dropped, from the component plugins. Used to click centers. */
const SIZE: Record<PartType, { w: number; h: number }> = {
  'power-core': { w: 80, h: 40 },
  'module-ic': { w: 100, h: 60 },
  'task-resistor': { w: 60, h: 20 },
  'decision-point': { w: 60, h: 60 },
  gateway: { w: 60, h: 60 },
};

/** Center of a part dropped at (x, y). Drops place the top-left corner at the drop point. */
export function centerOf(type: PartType, x: number, y: number) {
  return { x: x + SIZE[type].w / 2, y: y + SIZE[type].h / 2 };
}

/** Open the app with an empty board and no autosave. */
export async function openFreshBoard(page: Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitForApp(page);
}

export async function waitForApp(page: Page) {
  await page.waitForFunction(() => {
    const app = (window as any).app;
    return app && typeof app.addComponent === 'function';
  }, undefined, { timeout: 10_000 });
}

async function toPage(page: Page, x: number, y: number) {
  const box = await page.locator('#circuit-board').boundingBox();
  if (!box) throw new Error('Canvas not found');
  return { x: box.x + x, y: box.y + y };
}

/** Drag a part from the tray onto the canvas. Returns the part's center. */
export async function dropFromTray(page: Page, type: PartType, x: number, y: number) {
  await page.dragAndDrop(`#${type}-item`, '#circuit-board', { targetPosition: { x, y }, timeout: 5000 });
  await page.waitForTimeout(150);
  return centerOf(type, x, y);
}

export async function clickAt(page: Page, x: number, y: number) {
  const p = await toPage(page, x, y);
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(200);
}

/** Click an empty spot to clear the selection. */
export async function clickEmpty(page: Page) {
  await clickAt(page, 1200, 640);
}

export async function dragOnCanvas(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  const a = await toPage(page, from.x, from.y);
  const b = await toPage(page, to.x, to.y);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  const steps = 15;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(a.x + ((b.x - a.x) * i) / steps, a.y + ((b.y - a.y) * i) / steps);
  }
  await page.mouse.up();
  await page.waitForTimeout(300);
}

/** Double-click a Module IC to enter it. Waits for the transition animation. */
export async function enterModule(page: Page, center: { x: number; y: number }) {
  const p = await toPage(page, center.x, center.y);
  await page.mouse.dblclick(p.x, p.y);
  await page.waitForTimeout(700);
}

export async function pressBack(page: Page) {
  await page.click('#back-btn');
  await page.waitForTimeout(700);
}

export async function reloadPage(page: Page) {
  await page.reload();
  await waitForApp(page);
  await page.waitForTimeout(300);
}

/** Autosave is debounced by 1 s. Wait past it so the next step happens after a save. */
export async function waitForAutosave(page: Page) {
  await page.waitForTimeout(1500);
}

// ── Observations ────────────────────────────────────────────

export async function detailsPanelOpen(page: Page): Promise<boolean> {
  return page.evaluate(() => document.getElementById('datasheet-panel')?.classList.contains('active') ?? false);
}

export async function breadcrumb(page: Page): Promise<string> {
  return (await page.locator('#breadcrumb-nav').innerText()).replace(/\s+/g, ' ').trim();
}

/** Number of components in the current view (read-only; the UI has no list). */
export async function componentsInView(page: Page): Promise<number> {
  return page.evaluate(() => (window as any).app.getCurrentViewComponents().length);
}

/** Click a component and check the details panel opens for it. */
export async function expectSelectable(page: Page, center: { x: number; y: number }) {
  await clickEmpty(page);
  await clickAt(page, center.x, center.y);
  await expect.poll(() => detailsPanelOpen(page), { timeout: 2000 }).toBe(true);
}
