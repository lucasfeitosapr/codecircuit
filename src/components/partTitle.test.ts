import { describe, it, expect } from 'vitest';
import { partTitlePosition, MIN_TITLE_ZOOM } from './partTitle';

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
