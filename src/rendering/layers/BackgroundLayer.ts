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
      const canvas = (frame as any)?.canvas;
      
      // Clear canvas first
      if (canvas) {
        c.clearRect(
          0,
          0,
          canvas.width / window.devicePixelRatio,
          canvas.height / window.devicePixelRatio
        );
      }

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
