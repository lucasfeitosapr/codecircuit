import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ImplementationLayer from './ImplementationLayer';
import { createComponentRegistry, getComponentRegistry } from '../../components/ComponentRegistry';
import { eventBus } from '../../events/EventBus';

describe('ImplementationLayer', () => {
  const pluginId = 'test-plugin-impl';

  beforeEach(() => {
    // Initialize ComponentRegistry
    createComponentRegistry(eventBus);
  });

  afterEach(() => {
    try {
      const registry = getComponentRegistry();
      registry.unregister(pluginId);
    } catch (e) {
      // Ignore cleanup errors
    }
    vi.restoreAllMocks();
  });

  it('calls plugin.render for each visible model', () => {
    const renderSpy = vi.fn();
    const plugin = {
      type: pluginId,
      metadata: {
        displayName: 'Test Plugin Impl',
      },
      getRenderInstructions: (model: any) => [
        {
          render: renderSpy
        }
      ],
      serialize: (m: any) => m,
      deserialize: (d: any) => d,
      getMetadata: function() { return this.metadata; }
    } as any;

    const registry = getComponentRegistry();
    registry.register(plugin);

    const ctx = { fillRect: vi.fn(), save: vi.fn(), restore: vi.fn() } as any;
    const model = { id: 'm1', type: pluginId, x: 5, y: 6, width: 10, height: 12, color: '#abc' };
    const frame = {
      timestamp: Date.now(),
      camera: { x: 0, y: 0, zoom: 1 },
      payload: { models: [model] },
    } as any;

    ImplementationLayer.render(ctx, frame);

    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(renderSpy).toHaveBeenCalledWith(expect.any(Object), expect.any(Object));
  });
});
