import { PluginDescriptor, componentSystem } from '../ComponentSystem';
import { renderComponent } from '../../rendering/ImplementationHelpers';

export const TaskResistorPlugin: PluginDescriptor = {
  id: 'task-resistor',
  displayName: 'Task Resistor',
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
        return { shape: 'zigzag', color: '#cc6666', model };
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('TaskResistorPlugin.render failed', e);
    }
  },
  serialize: model => model,
  deserialize: data => data,
};

// PHASE 2: Temporarily disabled to prevent dual registration conflicts with V2 plugins
// componentSystem.register(TaskResistorPlugin);
