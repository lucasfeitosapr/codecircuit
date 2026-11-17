/**
 * Part icons: one registry, looked up by part type when drawing.
 *
 * Icons are never read from saved data, so changing an entry here updates
 * every board, including boards saved or exported before the change.
 *
 * Placeholders are plain shapes in the part's category color. To use a drawn
 * icon later, add `image` (a URL) to an entry; drawing code can switch on it
 * in one place (drawPartIcon / partIconSvg).
 */

export type PartIconShape = 'circle' | 'square' | 'bar' | 'diamond' | 'pentagon';

export interface PartIcon {
  shape: PartIconShape;
  /** Reserved for drawn icons. Not used yet. */
  image?: string;
}

export const PART_ICONS: Record<string, PartIcon> = {
  'power-core': { shape: 'circle' },
  'module-ic': { shape: 'square' },
  'task-resistor': { shape: 'bar' },
  'decision-point': { shape: 'diamond' },
  gateway: { shape: 'pentagon' },
};

const FALLBACK: PartIcon = { shape: 'square' };

export function partIcon(type: string | undefined): PartIcon {
  return (type && PART_ICONS[type]) || FALLBACK;
}

/** Outline points of a shape centered on (0, 0), `size` px tall. Null for the circle. */
function shapePoints(shape: PartIconShape, size: number): Array<[number, number]> | null {
  const h = size / 2;
  switch (shape) {
    case 'circle':
      return null;
    case 'square': {
      const s = h * 0.85;
      return [[-s, -s], [s, -s], [s, s], [-s, s]];
    }
    case 'bar': {
      const w = h * 1.4;
      const t = h * 0.45;
      return [[-w, -t], [w, -t], [w, t], [-w, t]];
    }
    case 'diamond':
      return [[0, -h], [h, 0], [0, h], [-h, 0]];
    case 'pentagon':
      return Array.from({ length: 5 }, (_, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        return [h * Math.cos(a), h * Math.sin(a)] as [number, number];
      });
  }
}

/** Draw the icon for `type` centered at (cx, cy), `size` px tall, in `color`. */
export function drawPartIcon(
  ctx: CanvasRenderingContext2D,
  type: string | undefined,
  cx: number,
  cy: number,
  size: number,
  color: string
): void {
  const { shape } = partIcon(type);
  const points = shapePoints(shape, size);
  // Put back exactly what we change (doesn't rely on save/restore, so callers and
  // test doubles see the same state they had before).
  const prev = { stroke: ctx.strokeStyle, fill: ctx.fillStyle, width: ctx.lineWidth, alpha: ctx.globalAlpha };
  ctx.beginPath();
  if (points) {
    points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(cx + x, cy + y) : ctx.lineTo(cx + x, cy + y)));
    ctx.closePath();
  } else {
    ctx.arc(cx, cy, (size / 2) * 0.9, 0, Math.PI * 2);
  }
  ctx.lineWidth = Math.max(1.5, size * 0.12);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.globalAlpha = prev.alpha * 0.3;
  ctx.fill();
  ctx.globalAlpha = prev.alpha;
  ctx.stroke();
  ctx.strokeStyle = prev.stroke;
  ctx.fillStyle = prev.fill;
  ctx.lineWidth = prev.width;
  ctx.beginPath(); // leave no open path for the caller's next fill/stroke
}

/** Same icon as inline SVG, for DOM places (parts tray, details panel). */
export function partIconSvg(type: string | undefined, size = 16, color = 'currentColor'): string {
  const { shape } = partIcon(type);
  const points = shapePoints(shape, size * 0.8);
  const c = size / 2;
  const sw = Math.max(1.5, size * 0.1).toFixed(1);
  const body = points
    ? `<polygon points="${points.map(([x, y]) => `${(c + x).toFixed(1)},${(c + y).toFixed(1)}`).join(' ')}"/>`
    : `<circle cx="${c}" cy="${c}" r="${(size * 0.36).toFixed(1)}"/>`;
  return (
    `<svg class="part-icon" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true" ` +
    `fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="${sw}">${body}</svg>`
  );
}

/** Category color for a part, from the render frame; white when unknown. */
export function partIconColor(frame: any, component: { category?: string; status?: string }): string {
  if (component.status === 'defined') return 'rgba(200, 255, 255, 0.85)';
  const categories = frame?.payload?.categories ?? frame?.categories;
  return categories?.[component.category ?? '']?.color ?? '#ffffff';
}
