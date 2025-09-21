import { PluginDescriptor, componentSystem } from '../ComponentSystem';
import { renderComponent } from '../../rendering/ImplementationHelpers';

export const ModuleICPlugin: PluginDescriptor = {
  id: 'module-ic',
  displayName: 'Module IC',
  render: (ctx: CanvasRenderingContext2D | WebGLRenderingContext, frame: any, model?: any) => {
    try {
      if (ctx && (ctx as CanvasRenderingContext2D).fillRect && model) {
        renderComponent(ctx as CanvasRenderingContext2D, frame, model, {
          camera: frame.camera,
          categories: (frame as any).categories ?? {},
          selectedComponentId: (frame as any).selectedComponentId ?? null,
          connections: (frame as any).payload?.connections ?? [],
        });
      } else {
        return { shape: 'rounded-rect', color: '#66ccff', model };
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('ModuleICPlugin.render failed', e);
    }
  },
  serialize: (model) => model,
  deserialize: (data) => data,
};

componentSystem.register(ModuleICPlugin);
