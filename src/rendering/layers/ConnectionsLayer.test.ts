import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ConnectionsLayer from './ConnectionsLayer';
import { PerformanceConfig } from '../../config/performanceConfig';

describe('ConnectionsLayer', () => {
  let ctx: any;
  let originalOptimizedRendererFlag: boolean;

  beforeEach(() => {
    // Disable optimized renderer for tests to test the legacy path
    originalOptimizedRendererFlag = PerformanceConfig.ENABLE_OPTIMIZED_CONNECTION_RENDERER;
    PerformanceConfig.ENABLE_OPTIMIZED_CONNECTION_RENDERER = false;

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

  afterEach(() => {
    // Restore original config
    PerformanceConfig.ENABLE_OPTIMIZED_CONNECTION_RENDERER = originalOptimizedRendererFlag;
  });

  it('draws simple lines for connections', () => {
    const conn = {
      id: 'c1',
      from: { x: 10, y: 10, component: { status: 'defined' } },
      to: { x: 30, y: 30, component: { status: 'defined' } },
    } as any;

    const frame = {
      timestamp: Date.now(),
      camera: { x: 0, y: 0, zoom: 1 },
      payload: { connections: [conn] },
    } as any;

    ConnectionsLayer.render(ctx, frame);

    // Orthogonal routing: from (10,10) → midX at 70% → (30,30)
    const midX = 10 + (30 - 10) * 0.7; // = 24
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.moveTo).toHaveBeenCalledWith(10, 10);
    expect(ctx.lineTo).toHaveBeenCalledWith(midX, 10);
    expect(ctx.lineTo).toHaveBeenCalledWith(midX, 30);
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
        categories: {},
      },
    } as any;

    ConnectionsLayer.render(ctx, frame);

    // Temporary connections also use orthogonal routing
    const midX = 5 + (25 - 5) * 0.7; // = 19
    expect(ctx.setLineDash).toHaveBeenCalled();
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.moveTo).toHaveBeenCalledWith(5, 5);
    expect(ctx.lineTo).toHaveBeenCalledWith(midX, 5);
    expect(ctx.lineTo).toHaveBeenCalledWith(midX, 25);
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
      { id: 'c1', from: { x: 10, y: 10, component: { status: 'defined' } }, to: { x: 30, y: 30, component: { status: 'defined' } } },
      { id: 'c2', from: { x: 50, y: 50, component: { status: 'defined' } }, to: { x: 70, y: 70, component: { status: 'defined' } } },
    ] as any[];

    const frame = {
      timestamp: Date.now(),
      camera: { x: 0, y: 0, zoom: 1 },
      payload: { connections },
    } as any;

    ConnectionsLayer.render(ctx, frame);

    // Each defined→defined connection gets 1 stroke call
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalledTimes(2);
  });

  it('handles render errors gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    ctx.beginPath.mockImplementation(() => {
      throw new Error('Canvas error');
    });

    const conn = { id: 'c1', from: { x: 10, y: 10, component: { status: 'defined' } }, to: { x: 30, y: 30, component: { status: 'defined' } } } as any;
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
