import { describe, it, expect } from 'vitest';
import { SpatialIndex } from './SpatialIndex';

// B-011: hit testing counts a part's right and bottom edges as inside (ComponentLifecycleManager),
// but the index treated them as outside, and gave a point on a quadrant border to one side only.
const part = (id: string, x: number, y: number, width = 50, height = 50) => ({ id, x, y, width, height }) as any;

describe('SpatialIndex edges (B-011)', () => {
  it("finds a part at its right and bottom edges @B-011", () => {
    const index = new SpatialIndex({ x: 0, y: 0, width: 1000, height: 1000 });
    const p = part('p', 100, 100);
    index.insert(p);
    expect(index.queryPoint(150, 150)).toContain(p); // bottom-right corner
    expect(index.queryPoint(150, 120)).toContain(p); // right edge
    expect(index.queryPoint(151, 120)).not.toContain(p); // just outside
  });

  it('finds a part whose edge lies on a quadrant border, after the tree splits @B-011', () => {
    const index = new SpatialIndex({ x: 0, y: 0, width: 1000, height: 1000 });
    // Right edge exactly on the root's vertical split (x = 500).
    const p = part('p', 450, 100);
    index.insert(p);
    // More than 10 parts forces a split.
    for (let i = 0; i < 12; i++) index.insert(part(`f${i}`, 600 + i * 20, 700));
    expect(index.queryPoint(500, 120)).toContain(p);
  });
});
