import { describe, it, expect, vi, beforeEach } from 'vitest';
import BackgroundLayer from './BackgroundLayer';
import * as renderer from '../../renderer';

describe('BackgroundLayer', () => {
  let ctx: any;
  let canvas: any;

  beforeEach(() => {
    // Mock canvas context
    ctx = {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
    };

    // Mock canvas
    canvas = {
      width: 800,
      height: 600,
    };

    // Mock window.devicePixelRatio
    Object.defineProperty(window, 'devicePixelRatio', {
      value: 2,
      writable: true,
    });

    vi.clearAllMocks();
  });

  it('clears canvas before drawing background', () => {
    const frame = {
      timestamp: Date.now(),
      camera: { x: 0, y: 0, zoom: 1 },
      canvas,
      payload: { viewType: 'main' },
    } as any;

    BackgroundLayer.render(ctx, frame);

    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 400, 300); // 800/2, 600/2
  });

  it('draws grid background for main view', () => {
    const drawGridSpy = vi.spyOn(renderer, 'drawGrid');
    const frame = {
      timestamp: Date.now(),
      camera: { x: 10, y: 20, zoom: 1.5 },
      canvas,
      payload: { viewType: 'main' },
    } as any;

    BackgroundLayer.render(ctx, frame);

    expect(drawGridSpy).toHaveBeenCalledWith(ctx, frame.camera, canvas);
  });

  it('draws schematic background for schematic view', () => {
    const drawSchematicSpy = vi.spyOn(renderer, 'drawSchematicBackground');
    const frame = {
      timestamp: Date.now(),
      camera: { x: 0, y: 0, zoom: 1 },
      canvas,
      payload: { viewType: 'schematic' },
    } as any;

    BackgroundLayer.render(ctx, frame);

    expect(drawSchematicSpy).toHaveBeenCalledWith(ctx, frame.camera, canvas);
  });

  it('defaults to main view when viewType is not specified', () => {
    const drawGridSpy = vi.spyOn(renderer, 'drawGrid');
    const frame = {
      timestamp: Date.now(),
      camera: { x: 0, y: 0, zoom: 1 },
      canvas,
      payload: {},
    } as any;

    BackgroundLayer.render(ctx, frame);

    expect(drawGridSpy).toHaveBeenCalledWith(ctx, frame.camera, canvas);
  });

  it('handles missing canvas gracefully', () => {
    const frame = {
      timestamp: Date.now(),
      camera: { x: 0, y: 0, zoom: 1 },
      payload: { viewType: 'main' },
    } as any;

    // Should not throw
    expect(() => BackgroundLayer.render(ctx, frame)).not.toThrow();
  });

  it('handles missing camera gracefully', () => {
    const drawGridSpy = vi.spyOn(renderer, 'drawGrid');
    const frame = {
      timestamp: Date.now(),
      canvas,
      payload: { viewType: 'main' },
    } as any;

    BackgroundLayer.render(ctx, frame);

    expect(drawGridSpy).toHaveBeenCalledWith(ctx, { x: 0, y: 0, zoom: 1 }, canvas);
  });

  it('handles renderer errors gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(renderer, 'drawGrid').mockImplementation(() => {
      throw new Error('Renderer error');
    });

    const frame = {
      timestamp: Date.now(),
      camera: { x: 0, y: 0, zoom: 1 },
      canvas,
      payload: { viewType: 'main' },
    } as any;

    // Should not throw
    expect(() => BackgroundLayer.render(ctx, frame)).not.toThrow();
    expect(consoleSpy).toHaveBeenCalledWith('BackgroundLayer render failed', expect.any(Error));

    consoleSpy.mockRestore();
  });
});
