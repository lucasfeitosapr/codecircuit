import { describe, it, expect, vi } from 'vitest';
import { PART_ICONS, partIcon, drawPartIcon, partIconSvg, partIconColor } from './icons';

function fakeCtx() {
  return {
    strokeStyle: '#111111', fillStyle: '#222222', lineWidth: 1, globalAlpha: 1,
    beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), closePath: vi.fn(),
    arc: vi.fn(), fill: vi.fn(), stroke: vi.fn(),
  } as any;
}

describe('part icons', () => {
  it('has an icon for every part type', () => {
    for (const t of ['power-core', 'module-ic', 'task-resistor', 'decision-point', 'gateway']) {
      expect(PART_ICONS[t]).toBeDefined();
    }
  });

  it('falls back to a square for unknown types', () => {
    expect(partIcon('unknown').shape).toBe('square');
    expect(partIcon(undefined).shape).toBe('square');
  });

  it('draws a circle with arc and polygons with lines', () => {
    const c = fakeCtx();
    drawPartIcon(c, 'power-core', 10, 10, 14, '#00ff88');
    expect(c.arc).toHaveBeenCalledTimes(1);

    const p = fakeCtx();
    drawPartIcon(p, 'gateway', 10, 10, 14, '#00ff88');
    expect(p.moveTo).toHaveBeenCalledTimes(1);
    expect(p.lineTo).toHaveBeenCalledTimes(4);
  });

  it('leaves the context state as it found it', () => {
    const c = fakeCtx();
    drawPartIcon(c, 'module-ic', 0, 0, 14, '#00ff88');
    expect(c.strokeStyle).toBe('#111111');
    expect(c.fillStyle).toBe('#222222');
    expect(c.lineWidth).toBe(1);
    expect(c.globalAlpha).toBe(1);
  });

  it('renders the same shapes as SVG', () => {
    expect(partIconSvg('power-core')).toContain('<circle');
    expect(partIconSvg('decision-point')).toContain('<polygon');
    expect(partIconSvg('gateway', 16, '#fff')).toContain('stroke="#fff"');
  });

  it('colors by category, cyan for defined parts', () => {
    const frame = { categories: { frontend: { color: '#00ff88' } } };
    expect(partIconColor(frame, { category: 'frontend', status: 'todo' })).toBe('#00ff88');
    expect(partIconColor(frame, { category: 'frontend', status: 'defined' })).toContain('200, 255, 255');
    expect(partIconColor({}, { category: 'x' })).toBe('#ffffff');
    // The layered renderer passes categories in frame.payload
    expect(partIconColor({ payload: frame }, { category: 'frontend', status: 'todo' })).toBe('#00ff88');
  });
});
