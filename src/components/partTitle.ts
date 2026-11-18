/**
 * Part titles (B-014). Tall parts draw the title inside, under the icon. Parts too short for
 * that (Power Core 40 px, Task Resistor 20 px at zoom 1) draw it just below their bottom edge
 * instead of skipping it. Below MIN_TITLE_ZOOM the text is too small to read, so it's left out.
 */
export const MIN_TITLE_ZOOM = 0.6;
const INSIDE_MIN_HEIGHT = 40; // screen px needed for icon + title inside the part

export interface PartTitleArgs {
  title: string;
  status?: string;
  centerX: number;
  centerY: number;
  screenY: number;
  screenHeight: number;
  zoom: number;
}

/** Where the title goes, or null when it isn't drawn. Pure, for tests. */
export function partTitlePosition(a: PartTitleArgs): { x: number; y: number; inside: boolean } | null {
  if (a.screenHeight > INSIDE_MIN_HEIGHT) return { x: a.centerX, y: a.centerY + 15 * a.zoom, inside: true };
  if (a.zoom < MIN_TITLE_ZOOM) return null;
  return { x: a.centerX, y: a.screenY + a.screenHeight + 9 * a.zoom, inside: false };
}

export function drawPartTitle(ctx: CanvasRenderingContext2D, a: PartTitleArgs): void {
  const pos = partTitlePosition(a);
  if (!pos) return;
  ctx.save();
  if (a.status === 'defined') {
    ctx.font = `${10 * a.zoom}px monospace italic`;
    ctx.fillStyle = 'rgba(200, 255, 255, 0.7)';
  } else {
    ctx.font = `${10 * a.zoom}px monospace`;
    ctx.fillStyle = '#ffffff';
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(a.title, pos.x, pos.y);
  ctx.restore();
}
