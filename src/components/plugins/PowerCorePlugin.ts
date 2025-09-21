import { PluginDescriptor, componentSystem } from '../ComponentSystem';
import { renderComponent } from '../../rendering/ImplementationHelpers';

export const PowerCorePlugin: PluginDescriptor = {
  id: 'power-core',
  displayName: 'Power Core',
  render: (ctx: CanvasRenderingContext2D | WebGLRenderingContext, frame: any, model?: any) => {
    // If a canvas context is provided, draw a simple filled rectangle representing the power core
    try {
      if (ctx && (ctx as CanvasRenderingContext2D).fillRect && model) {
        // Use centralized implementation helper for consistent visuals
        renderComponent(ctx as CanvasRenderingContext2D, frame, model, {
          camera: frame.camera,
          categories: (frame as any).categories ?? {},
          selectedComponentId: (frame as any).selectedComponentId ?? null,
          connections: (frame as any).payload?.connections ?? [],
        });
      } else {
        // Fallback: return a passive render descriptor
        return { shape: 'square', color: '#ffcc00', model };
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('PowerCorePlugin.render failed', e);
    }
  },
  serialize: (model) => model,
  deserialize: (data) => data,
};

componentSystem.register(PowerCorePlugin);
