import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { partTitlePosition, drawPartTitle, MIN_TITLE_ZOOM } from './partTitle';

const base = { title: 't', centerX: 50, centerY: 10, screenY: 0, zoom: 1 };

describe('partTitlePosition (B-014)', () => {
  it('tall parts keep the title inside, under the icon', () => {
    expect(partTitlePosition({ ...base, centerY: 30, screenHeight: 60 })).toEqual({ x: 50, y: 45, inside: true });
  });

  it('short parts put the title below their bottom edge', () => {
    const pos = partTitlePosition({ ...base, screenHeight: 20 })!;
    expect(pos.inside).toBe(false);
    expect(pos.y).toBeGreaterThan(20);
  });

  it('a 40 px part (Power Core at zoom 1) counts as short', () => {
    expect(partTitlePosition({ ...base, screenHeight: 40 })!.inside).toBe(false);
  });

  it('below the minimum zoom, short parts skip the unreadable title', () => {
    expect(partTitlePosition({ ...base, screenHeight: 20 * 0.5, zoom: MIN_TITLE_ZOOM - 0.1 })).toBeNull();
  });
});

// B-020: "10px monospace italic" is not a valid CSS font (style must come first), so the canvas
// ignores it and keeps whatever font was set before: dashed ('defined') parts got huge titles.
const VALID_CANVAS_FONT = /^(italic |bold |italic bold )?\d+(\.\d+)?px [\w-]+$/;

describe('canvas fonts (B-020)', () => {
  it("a 'defined' part's title uses a valid italic font @B-020", () => {
    const ctx: any = { save() {}, restore() {}, fillText() {} };
    drawPartTitle(ctx, { title: 't', status: 'defined', centerX: 0, centerY: 0, screenY: 0, screenHeight: 20, zoom: 1 });
    expect(ctx.font).toMatch(VALID_CANVAS_FONT);
    expect(ctx.font.startsWith('italic ')).toBe(true);
  });

  it('no source file puts the font style after the family @B-020', () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (name === 'archived' || name === 'node_modules') continue;
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(name) && !name.includes('.test.')) {
          readFileSync(p, 'utf-8').split('\n').forEach((line, i) => {
            if (/px [\w-]+ (italic|bold)\b/.test(line)) offenders.push(`${p}:${i + 1}`);
          });
        }
      }
    };
    walk(join(__dirname, '..'));
    expect(offenders).toEqual([]);
  });
});
