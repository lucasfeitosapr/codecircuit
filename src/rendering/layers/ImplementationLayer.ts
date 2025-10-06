import { getComponentRegistry } from '../../components/ComponentRegistry';
import { PerformanceConfig } from '../../config/performanceConfig';
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

      // Viewport culling in world space to cut component render cost
      const camera = frame.camera || { x: 0, y: 0, zoom: 1 };
      const c2d = ctx as CanvasRenderingContext2D;
      const canvas = (c2d && (c2d as any).canvas) as HTMLCanvasElement | undefined;
      const dpr = window.devicePixelRatio || 1;
      const viewportX = -camera.x / camera.zoom;
      const viewportY = -camera.y / camera.zoom;
      const viewportWidth = (canvas ? canvas.width / dpr : 0) / camera.zoom;
      const viewportHeight = (canvas ? canvas.height / dpr : 0) / camera.zoom;
      const margin = 100 / camera.zoom; // generous margin in world space

      const visibleModels = models.filter((m: any) => {
        const w = m.width ?? 60;
        const h = m.height ?? 20;
        return !(
          m.x + w < viewportX - margin ||
          m.x > viewportX + viewportWidth + margin ||
          m.y + h < viewportY - margin ||
          m.y > viewportY + viewportHeight + margin
        );
      });

      // Keep payload.models consistent with what we render
      fp.models = visibleModels;

      const componentRegistry = getComponentRegistry();

      if (PerformanceConfig.ENABLE_BATCH_RENDERING) {
        // Group visible models by type to minimize plugin/type switches
        const groups = new Map<string, any[]>();
        for (const m of visibleModels) {
          const t = m.type;
          if (!groups.has(t)) groups.set(t, []);
          groups.get(t)!.push(m);
        }

        for (const [type, group] of groups) {
          // Optional: set up shared state per type (keep minimal to respect plugin control)
          (ctx as CanvasRenderingContext2D).save?.();
          try {
            const plugin = componentRegistry.get(type);
            for (const model of group) {
              if (!plugin) continue;
              const instructions = plugin.getRenderInstructions(model);
              if (instructions && instructions.length > 0) {
                instructions[0].render(ctx as CanvasRenderingContext2D, frame);
              }
            }
          } catch (e) {
            console.error(`V2 plugin render failed for group ${type}:`, e);
          } finally {
            (ctx as CanvasRenderingContext2D).restore?.();
          }
        }
      } else {
        // Fallback: render sequentially
        for (const model of visibleModels) {
          try {
            const plugin = componentRegistry.get(model.type);
            if (plugin) {
              const instructions = plugin.getRenderInstructions(model);
              if (instructions && instructions.length > 0) {
                instructions[0].render(ctx as CanvasRenderingContext2D, frame);
              }
            }
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error(`V2 plugin render failed for ${model.type}:`, e);
          }
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('ImplementationLayer render failed', e);
    }
  },
};

export default ImplementationLayer;
