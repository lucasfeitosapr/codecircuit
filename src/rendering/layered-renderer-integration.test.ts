import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { layeredRenderer } from './LayeredRenderer';
import BackgroundLayer from './layers/BackgroundLayer';
import ImplementationLayer from './layers/ImplementationLayer';
import ConnectionsLayer from './layers/ConnectionsLayer';
import { componentSystem } from '../components/ComponentSystem';
import * as featureFlags from '../config/featureFlags';
import * as legacyRenderer from '../renderer';

describe('LayeredRenderer Integration', () => {
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
      arc: vi.fn(),
      fill: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      setLineDash: vi.fn(),
      // properties
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      shadowBlur: 0,
      shadowColor: '',
    };

    // Mock canvas
    canvas = {
      width: 800,
      height: 600,
    };

    // Clear layers
    try {
      // @ts-ignore
      layeredRenderer['layers'].clear();
    } catch (e) {
      // Ignore cleanup errors
    }

    // Clear component system
    try {
      componentSystem.unregister('test-plugin');
    } catch (e) {
      // Ignore cleanup errors
    }

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders all layers in correct order when feature flag is enabled', () => {
    vi.spyOn(featureFlags, 'isNewRendererEnabled').mockReturnValue(true);

    // Register all layers
    layeredRenderer.registerLayer('background', BackgroundLayer);
    layeredRenderer.registerLayer('implementation', ImplementationLayer);
    layeredRenderer.registerLayer('connections', ConnectionsLayer);

    // Register a test plugin
    const renderSpy = vi.fn();
    const plugin = {
      id: 'test-plugin',
      displayName: 'Test Plugin',
      render: renderSpy,
      serialize: (m: any) => m,
      deserialize: (d: any) => d,
    };
    componentSystem.register(plugin);

    const frame = {
      timestamp: Date.now(),
      camera: { x: 0, y: 0, zoom: 1 },
      canvas,
      payload: {
        viewType: 'main',
        models: [{ id: 'm1', type: 'test-plugin', x: 10, y: 10, width: 50, height: 50 }],
        connections: [],
      },
    };

    layeredRenderer.render(ctx, frame);

    // Background layer should clear canvas
    expect(ctx.clearRect).toHaveBeenCalled();

    // Implementation layer should call plugin render
    expect(renderSpy).toHaveBeenCalledWith(
      ctx,
      frame,
      expect.objectContaining({ type: 'test-plugin' })
    );

    // Connections layer should be called (even with empty connections)
    expect(ctx.beginPath).toHaveBeenCalled();
  });

  it('delegates to legacy renderer when feature flag is disabled', () => {
    vi.spyOn(featureFlags, 'isNewRendererEnabled').mockReturnValue(false);
    const legacyRenderSpy = vi.spyOn(legacyRenderer, 'render');

    const frame = {
      timestamp: Date.now(),
      camera: { x: 0, y: 0, zoom: 1 },
      canvas,
      payload: { viewType: 'main' },
    };

    layeredRenderer.render(ctx, frame);

    expect(legacyRenderSpy).toHaveBeenCalledWith(ctx, frame);
  });

  it('handles layer registration errors gracefully', () => {
    vi.spyOn(featureFlags, 'isNewRendererEnabled').mockReturnValue(true);

    // Register a layer that will throw an error
    const errorLayer = {
      name: 'error-layer',
      render: () => {
        throw new Error('Layer render error');
      },
    };

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    layeredRenderer.registerLayer('error-layer', errorLayer);

    const frame = {
      timestamp: Date.now(),
      camera: { x: 0, y: 0, zoom: 1 },
      canvas,
      payload: { viewType: 'main' },
    };

    expect(() => layeredRenderer.render(ctx, frame)).not.toThrow();
    expect(consoleSpy).toHaveBeenCalledWith(
      'LayeredRenderer: layer error-layer failed',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('handles missing frame payload gracefully', () => {
    vi.spyOn(featureFlags, 'isNewRendererEnabled').mockReturnValue(true);

    layeredRenderer.registerLayer('background', BackgroundLayer);
    layeredRenderer.registerLayer('implementation', ImplementationLayer);
    layeredRenderer.registerLayer('connections', ConnectionsLayer);

    const frame = {
      timestamp: Date.now(),
      camera: { x: 0, y: 0, zoom: 1 },
      canvas,
      // missing payload
    };

    expect(() => layeredRenderer.render(ctx, frame)).not.toThrow();
  });

  it('renders with different view types correctly', () => {
    vi.spyOn(featureFlags, 'isNewRendererEnabled').mockReturnValue(true);

    const drawGridSpy = vi.spyOn(legacyRenderer, 'drawGrid');
    const drawSchematicSpy = vi.spyOn(legacyRenderer, 'drawSchematicBackground');

    layeredRenderer.registerLayer('background', BackgroundLayer);

    // Test main view
    const mainFrame = {
      timestamp: Date.now(),
      camera: { x: 0, y: 0, zoom: 1 },
      canvas,
      payload: { viewType: 'main' },
    };

    layeredRenderer.render(ctx, mainFrame);
    expect(drawGridSpy).toHaveBeenCalled();

    // Test schematic view
    const schematicFrame = {
      timestamp: Date.now(),
      camera: { x: 0, y: 0, zoom: 1 },
      canvas,
      payload: { viewType: 'schematic' },
    };

    layeredRenderer.render(ctx, schematicFrame);
    expect(drawSchematicSpy).toHaveBeenCalled();
  });

  it('handles component rendering with different statuses', () => {
    vi.spyOn(featureFlags, 'isNewRendererEnabled').mockReturnValue(true);

    const renderSpy = vi.fn();
    const plugin = {
      id: 'test-plugin',
      displayName: 'Test Plugin',
      render: renderSpy,
      serialize: (m: any) => m,
      deserialize: (d: any) => d,
    };
    componentSystem.register(plugin);

    layeredRenderer.registerLayer('implementation', ImplementationLayer);

    const models = [
      { id: 'm1', type: 'test-plugin', x: 10, y: 10, width: 50, height: 50, status: 'TODO' },
      { id: 'm2', type: 'test-plugin', x: 70, y: 10, width: 50, height: 50, status: 'IN_PROGRESS' },
      { id: 'm3', type: 'test-plugin', x: 130, y: 10, width: 50, height: 50, status: 'DONE' },
    ];

    const frame = {
      timestamp: Date.now(),
      camera: { x: 0, y: 0, zoom: 1 },
      canvas,
      payload: {
        models,
        categories: {},
        selectedComponentId: null,
      },
    };

    layeredRenderer.render(ctx, frame);

    expect(renderSpy).toHaveBeenCalledTimes(3);
    expect(renderSpy).toHaveBeenCalledWith(ctx, frame, models[0]);
    expect(renderSpy).toHaveBeenCalledWith(ctx, frame, models[1]);
    expect(renderSpy).toHaveBeenCalledWith(ctx, frame, models[2]);
  });
});
