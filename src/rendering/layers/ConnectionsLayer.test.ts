import { describe, it, expect, vi } from 'vitest';
import ConnectionsLayer from './ConnectionsLayer';

describe('ConnectionsLayer', () => {
  let ctx: any;

  beforeEach(() => {
    ctx = {
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      setLineDash: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      // properties used by ConnectionsLayer
      shadowBlur: 0,
      shadowColor: '',
      lineWidth: 0,
      strokeStyle: '',
      fillStyle: '',
      canvas: { width: 200, height: 200 },
    };
    vi.clearAllMocks();
  });

  it('draws simple lines for connections', () => {
    const conn = {
      id: 'c1',
      from: { x: 10, y: 10 },
      to: { x: 30, y: 30 },
    } as any;

    const frame = {
      timestamp: Date.now(),
      camera: { x: 0, y: 0, zoom: 1 },
      payload: { connections: [conn] },
    } as any;

    ConnectionsLayer.render(ctx, frame);

    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.moveTo).toHaveBeenCalledWith(10, 10);
    expect(ctx.lineTo).toHaveBeenCalledWith(30, 30);
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('draws temporary connection when isConnecting is true', () => {
    const frame = {
      timestamp: Date.now(),
      camera: { x: 0, y: 0, zoom: 1 },
      payload: {
        connections: [],
        isConnecting: true,
        connectionStart: { x: 5, y: 5 },
        mousePos: { x: 25, y: 25 },
      },
    } as any;

    ConnectionsLayer.render(ctx, frame);

    expect(ctx.setLineDash).toHaveBeenCalledWith([5, 5]);
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.moveTo).toHaveBeenCalledWith(5, 5);
    expect(ctx.lineTo).toHaveBeenCalledWith(25, 25);
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('does not draw temporary connection when isConnecting is false', () => {
    const frame = {
      timestamp: Date.now(),
      camera: { x: 0, y: 0, zoom: 1 },
      payload: {
        connections: [],
        isConnecting: false,
        connectionStart: { x: 5, y: 5 },
        mousePos: { x: 25, y: 25 },
      },
    } as any;

    ConnectionsLayer.render(ctx, frame);

    expect(ctx.setLineDash).not.toHaveBeenCalled();
  });

  it('handles missing connections array gracefully', () => {
    const frame = { timestamp: Date.now(), camera: { x: 0, y: 0, zoom: 1 }, payload: {} } as any;

    expect(() => ConnectionsLayer.render(ctx, frame)).not.toThrow();
  });

  it('handles empty connections array', () => {
    const frame = {
      timestamp: Date.now(),
      camera: { x: 0, y: 0, zoom: 1 },
      payload: { connections: [] },
    } as any;

    ConnectionsLayer.render(ctx, frame);

    expect(ctx.beginPath).not.toHaveBeenCalled();
  });

  it('handles multiple connections', () => {
    const connections = [
      { id: 'c1', from: { x: 10, y: 10 }, to: { x: 30, y: 30 } },
      { id: 'c2', from: { x: 50, y: 50 }, to: { x: 70, y: 70 } },
    ] as any[];

    const frame = {
      timestamp: Date.now(),
      camera: { x: 0, y: 0, zoom: 1 },
      payload: { connections },
    } as any;

    ConnectionsLayer.render(ctx, frame);

    expect(ctx.beginPath).toHaveBeenCalledTimes(2);
    expect(ctx.stroke).toHaveBeenCalledTimes(2);
  });

  it('handles render errors gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    ctx.beginPath.mockImplementation(() => {
      throw new Error('Canvas error');
    });

    const conn = { id: 'c1', from: { x: 10, y: 10 }, to: { x: 30, y: 30 } } as any;
    const frame = {
      timestamp: Date.now(),
      camera: { x: 0, y: 0, zoom: 1 },
      payload: { connections: [conn] },
    } as any;

    expect(() => ConnectionsLayer.render(ctx, frame)).not.toThrow();
    expect(consoleSpy).toHaveBeenCalledWith('ConnectionsLayer render failed', expect.any(Error));

    consoleSpy.mockRestore();
  });
});
