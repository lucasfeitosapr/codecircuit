import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { STATUS_COLORS, CATEGORY_COLORS } from './palette';

// S-015: no category color may look like a status color or like another category.
// Distance: CIE76 delta E in Lab space (about 2.3 = just noticeable; we ask for far more).
function lab(hex: string): [number, number, number] {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c =>
    c > 0.04045 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92
  );
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}
const deltaE = (a: string, b: string) => Math.hypot(...lab(a).map((v, i) => v - lab(b)[i]));
const MIN_FROM_STATUS = 40;
const MIN_BETWEEN_CATEGORIES = 30;

describe('palette (S-015)', () => {
  const cats = Object.entries(CATEGORY_COLORS);

  it('no category color is close to a status color @S-015', () => {
    const close = cats.flatMap(([c, { color }]) =>
      Object.entries(STATUS_COLORS)
        .filter(([, s]) => deltaE(color, s) < MIN_FROM_STATUS)
        .map(([st, s]) => `${c} ${color} ~ ${st} ${s} (${deltaE(color, s).toFixed(0)})`)
    );
    expect(close).toEqual([]);
  });

  it('no two category colors are close to each other @S-015', () => {
    const close: string[] = [];
    cats.forEach(([a, x], i) =>
      cats.slice(i + 1).forEach(([b, y]) => {
        if (deltaE(x.color, y.color) < MIN_BETWEEN_CATEGORIES)
          close.push(`${a} ${x.color} ~ ${b} ${y.color} (${deltaE(x.color, y.color).toFixed(0)})`);
      })
    );
    expect(close).toEqual([]);
  });

  it('the parts-tray legend in index.html shows the palette colors @S-015', () => {
    const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf-8');
    for (const { name, color } of Object.values(CATEGORY_COLORS)) {
      const re = new RegExp(`background: ${color}[^>]*>\\s*</div>\\s*<span>${name}</span>`, 'i');
      expect(html).toMatch(re);
    }
  });
});
