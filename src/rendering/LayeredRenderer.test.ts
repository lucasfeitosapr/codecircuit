// LayeredRenderer.test.ts - Tests rendering layer management and execution
// Tests the layered rendering system's layer registration and execution

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LayeredRenderer, Layer, RenderFrame } from './LayeredRenderer';
import * as featureFlags from '../config/featureFlags';

describe('LayeredRenderer', () => {
  let renderer: LayeredRenderer;
  let mockContext: any;
  let mockFrame: RenderFrame;

  beforeEach(() => {
    renderer = new LayeredRenderer();
    mockContext = {
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      clearRect: vi.fn(),
      canvas: { width: 800, height: 600 },
    };
    mockFrame = {
      timestamp: Date.now(),
      camera: { x: 0, y: 0, zoom: 1 },
    };

    // Enable new renderer by default for tests
    vi.spyOn(featureFlags, 'isNewRendererEnabled').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Layer Registration', () => {
    it('should register a layer', () => {
      const layer: Layer = {
        name: 'test-layer',
        render: vi.fn(),
      };

      renderer.registerLayer('test-layer', layer);

      expect(renderer.getRegisteredLayers()).toContain('test-layer');
    });

    it('should throw when registering duplicate layer', () => {
      const layer: Layer = {
        name: 'duplicate',
        render: vi.fn(),
      };

      renderer.registerLayer('duplicate', layer);

      expect(() => {
        renderer.registerLayer('duplicate', layer);
      }).toThrow('Layer duplicate already registered');
    });

    it('should unregister a layer', () => {
      const layer: Layer = {
        name: 'removable',
        render: vi.fn(),
      };

      renderer.registerLayer('removable', layer);
      expect(renderer.getRegisteredLayers()).toContain('removable');

      renderer.unregisterLayer('removable');
      expect(renderer.getRegisteredLayers()).not.toContain('removable');
    });

    it('should return all registered layer names', () => {
      const layer1: Layer = { name: 'layer1', render: vi.fn() };
      const layer2: Layer = { name: 'layer2', render: vi.fn() };
      const layer3: Layer = { name: 'layer3', render: vi.fn() };

      renderer.registerLayer('layer1', layer1);
      renderer.registerLayer('layer2', layer2);
      renderer.registerLayer('layer3', layer3);

      const layers = renderer.getRegisteredLayers();
      expect(layers).toHaveLength(3);
      expect(layers).toContain('layer1');
      expect(layers).toContain('layer2');
      expect(layers).toContain('layer3');
    });
  });

  describe('Layer Rendering', () => {
    it('should call render on all registered layers', () => {
      const layer1: Layer = { name: 'layer1', render: vi.fn() };
      const layer2: Layer = { name: 'layer2', render: vi.fn() };

      renderer.registerLayer('layer1', layer1);
      renderer.registerLayer('layer2', layer2);

      renderer.render(mockContext, mockFrame);

      expect(layer1.render).toHaveBeenCalledWith(mockContext, mockFrame);
      expect(layer2.render).toHaveBeenCalledWith(mockContext, mockFrame);
    });

    it('should render layers in registration order', () => {
      const callOrder: string[] = [];
      const layer1: Layer = {
        name: 'layer1',
        render: () => callOrder.push('layer1'),
      };
      const layer2: Layer = {
        name: 'layer2',
        render: () => callOrder.push('layer2'),
      };
      const layer3: Layer = {
        name: 'layer3',
        render: () => callOrder.push('layer3'),
      };

      renderer.registerLayer('layer1', layer1);
      renderer.registerLayer('layer2', layer2);
      renderer.registerLayer('layer3', layer3);

      renderer.render(mockContext, mockFrame);

      expect(callOrder).toEqual(['layer1', 'layer2', 'layer3']);
    });

    it('should pass context and frame to each layer', () => {
      const layer: Layer = { name: 'test', render: vi.fn() };

      renderer.registerLayer('test', layer);
      renderer.render(mockContext, mockFrame);

      expect(layer.render).toHaveBeenCalledWith(mockContext, mockFrame);
    });

    it('should handle rendering with no layers', () => {
      expect(() => {
        renderer.render(mockContext, mockFrame);
      }).not.toThrow();
    });

    it('should continue rendering other layers if one fails', () => {
      const errorLayer: Layer = {
        name: 'error-layer',
        render: () => {
          throw new Error('Layer render error');
        },
      };
      const successLayer: Layer = {
        name: 'success-layer',
        render: vi.fn(),
      };

      renderer.registerLayer('error-layer', errorLayer);
      renderer.registerLayer('success-layer', successLayer);

      // Should not throw, and should call success layer
      renderer.render(mockContext, mockFrame);

      expect(successLayer.render).toHaveBeenCalled();
    });

    it('should pass camera data through frame', () => {
      const layer: Layer = { name: 'camera-layer', render: vi.fn() };
      const frameWithCamera = {
        timestamp: Date.now(),
        camera: { x: 100, y: 200, zoom: 1.5 },
      };

      renderer.registerLayer('camera-layer', layer);
      renderer.render(mockContext, frameWithCamera);

      expect(layer.render).toHaveBeenCalledWith(
        mockContext,
        expect.objectContaining({
          camera: { x: 100, y: 200, zoom: 1.5 },
        })
      );
    });

    it('should pass arbitrary payload through frame', () => {
      const layer: Layer = { name: 'payload-layer', render: vi.fn() };
      const frameWithPayload = {
        timestamp: Date.now(),
        payload: { components: [], connections: [] },
      };

      renderer.registerLayer('payload-layer', layer);
      renderer.render(mockContext, frameWithPayload);

      expect(layer.render).toHaveBeenCalledWith(
        mockContext,
        expect.objectContaining({
          payload: expect.any(Object),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should isolate layer rendering errors', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const failingLayer: Layer = {
        name: 'failing',
        render: () => {
          throw new Error('Render failed');
        },
      };

      renderer.registerLayer('failing', failingLayer);

      expect(() => {
        renderer.render(mockContext, mockFrame);
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('layer failing failed'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should render remaining layers after error', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const layer1: Layer = {
        name: 'error1',
        render: () => {
          throw new Error('Error 1');
        },
      };
      const layer2: Layer = { name: 'success', render: vi.fn() };
      const layer3: Layer = {
        name: 'error2',
        render: () => {
          throw new Error('Error 2');
        },
      };

      renderer.registerLayer('error1', layer1);
      renderer.registerLayer('success', layer2);
      renderer.registerLayer('error2', layer3);

      renderer.render(mockContext, mockFrame);

      expect(layer2.render).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('WebGL Context Support', () => {
    it('should support WebGL rendering context', () => {
      const webglContext = {
        clear: vi.fn(),
        clearColor: vi.fn(),
        canvas: { width: 800, height: 600 },
      };

      const layer: Layer = {
        name: 'webgl-layer',
        render: vi.fn(),
      };

      renderer.registerLayer('webgl-layer', layer);
      renderer.render(webglContext as any, mockFrame);

      expect(layer.render).toHaveBeenCalledWith(webglContext, mockFrame);
    });
  });

  describe('Layer Management', () => {
    it('should allow re-registering after unregistering', () => {
      const layer: Layer = { name: 'reusable', render: vi.fn() };

      renderer.registerLayer('reusable', layer);
      renderer.unregisterLayer('reusable');
      renderer.registerLayer('reusable', layer);

      expect(renderer.getRegisteredLayers()).toContain('reusable');
    });

    it('should handle unregistering non-existent layer', () => {
      expect(() => {
        renderer.unregisterLayer('non-existent');
      }).not.toThrow();
    });

    it('should clear all layers when unregistering all', () => {
      const layer1: Layer = { name: 'layer1', render: vi.fn() };
      const layer2: Layer = { name: 'layer2', render: vi.fn() };

      renderer.registerLayer('layer1', layer1);
      renderer.registerLayer('layer2', layer2);

      renderer.unregisterLayer('layer1');
      renderer.unregisterLayer('layer2');

      expect(renderer.getRegisteredLayers()).toHaveLength(0);
    });
  });
});
