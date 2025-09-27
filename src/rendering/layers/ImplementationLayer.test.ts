import { describe, it, expect, vi, afterEach } from 'vitest';
import ImplementationLayer from './ImplementationLayer';
import { componentSystem } from '../../components/ComponentSystem';

describe('ImplementationLayer', () => {
  const pluginId = 'test-plugin-impl';

  afterEach(() => {
    try {
      componentSystem.unregister(pluginId);
    } catch (e) {
      // Ignore cleanup errors
    }
    vi.restoreAllMocks();
  });

  it('calls plugin.render for each visible model', () => {
    const renderSpy = vi.fn();
    const plugin = {
      id: pluginId,
      displayName: 'Test Plugin Impl',
      render: renderSpy,
      serialize: (m: any) => m,
      deserialize: (d: any) => d,
    } as any;

    componentSystem.register(plugin);

    const ctx = { fillRect: vi.fn() } as any;
    const model = { id: 'm1', type: pluginId, x: 5, y: 6, width: 10, height: 12, color: '#abc' };
    const frame = {
      timestamp: Date.now(),
      camera: { x: 0, y: 0, zoom: 1 },
      payload: { models: [model] },
    } as any;

    ImplementationLayer.render(ctx, frame);

    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(renderSpy).toHaveBeenCalledWith(ctx, frame, model);
  });
});
