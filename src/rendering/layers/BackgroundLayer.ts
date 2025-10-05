import type { RenderFrame } from '../LayeredRenderer';
import {
  drawGrid as rendererDrawGrid,
  drawSchematicBackground as rendererDrawSchematicBackground,
} from '../../renderer';

export const BackgroundLayer = {
  name: 'background',
  render(ctx: CanvasRenderingContext2D | WebGLRenderingContext, frame: RenderFrame) {
    try {
      const c = ctx as CanvasRenderingContext2D;
      const camera = frame?.camera ?? { x: 0, y: 0, zoom: 1 };
      // Use frame-provided canvas if available; otherwise fall back to ctx.canvas
      const canvas: HTMLCanvasElement | undefined =
        ((frame as any)?.canvas as HTMLCanvasElement | undefined) ||
        ((c && (c as any).canvas) as HTMLCanvasElement | undefined);

      // If still no canvas is available, attempt a safe clear using the context dimensions
      if (!canvas) {
        const dpr = window.devicePixelRatio || 1;
        // @ts-ignore - width/height may not be present; guard fallback
        const width = (c as any)?.canvas?.width || (c as any)?.width || 0;
        // @ts-ignore
        const height = (c as any)?.canvas?.height || (c as any)?.height || 0;
        if (width && height) {
          c.clearRect(0, 0, width / dpr, height / dpr);
        }
        return;
      }

      // Clear canvas first
      c.clearRect(
        0,
        0,
        canvas.width / window.devicePixelRatio,
        canvas.height / window.devicePixelRatio
      );

      // Draw appropriate background based on view type
      const viewType = (frame as any)?.payload?.viewType ?? 'main';
      if (viewType === 'schematic') {
        rendererDrawSchematicBackground(c, camera, canvas);
      } else {
        rendererDrawGrid(c, camera, canvas);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('BackgroundLayer render failed', e);
    }
  },
};

export default BackgroundLayer;
