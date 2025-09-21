import { describe, it, expect, vi } from 'vitest';
import ConnectionsLayer from './ConnectionsLayer';

describe('ConnectionsLayer', () => {
  it('draws simple lines for connections', () => {
    const beginPath = vi.fn();
    const moveTo = vi.fn();
    const lineTo = vi.fn();
    const stroke = vi.fn();
    const setLineDash = vi.fn();

    const ctx = {
      beginPath,
      moveTo,
      lineTo,
      stroke,
      setLineDash,
      // properties used by ConnectionsLayer
      shadowBlur: 0,
      shadowColor: '',
      lineWidth: 0,
      strokeStyle: '',
      canvas: { width: 200, height: 200 },
      arc: vi.fn(),
      fill: vi.fn(),
    } as any;

    const conn = {
      id: 'c1',
      from: { x: 10, y: 10 },
      to: { x: 30, y: 30 },
    } as any;

    const frame = { timestamp: Date.now(), camera: { x: 0, y: 0, zoom: 1 }, payload: { connections: [conn] } } as any;

    ConnectionsLayer.render(ctx, frame);

    expect(beginPath).toHaveBeenCalled();
    expect(moveTo).toHaveBeenCalledWith(10, 10);
    expect(lineTo).toHaveBeenCalledWith(30, 30);
    expect(stroke).toHaveBeenCalled();
  });
});
