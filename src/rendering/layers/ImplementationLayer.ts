import { getComponentRegistry } from '../../components/ComponentRegistry';
import type { RenderFrame } from '../LayeredRenderer';

// Cache bust: 2024-01-20 - Removed all console logs

export const ImplementationLayer = {
  name: 'implementation',
  render(ctx: CanvasRenderingContext2D | WebGLRenderingContext, frame: RenderFrame) {
    try {
      const models: any[] = frame?.payload?.models ?? [];
      const categories = (frame as any)?.payload?.categories ?? {};
      const selectedComponentId = (frame as any)?.payload?.selectedComponentId ?? null;
      const connections = (frame as any)?.payload?.connections ?? [];

      // Augment the incoming frame.payload in-place so callers that rely on reference equality
      // (tests, legacy code) continue to work while providing plugins the extra fields.
      const fp = ((frame as any).payload = { ...(frame as any).payload });
      fp.categories = fp.categories ?? categories;
      fp.selectedComponentId = fp.selectedComponentId ?? selectedComponentId;
      fp.connections = fp.connections ?? connections;

      for (const model of models) {
        try {
          const componentRegistry = getComponentRegistry();
          const plugin = componentRegistry.get(model.type);

          if (plugin) {
            plugin.renderComponent(ctx, frame, model);
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(`V2 plugin render failed for ${model.type}:`, e);
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('ImplementationLayer render failed', e);
    }
  },
};

export default ImplementationLayer;
